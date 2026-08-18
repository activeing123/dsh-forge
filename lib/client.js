/**
 * dsh-forge “技能自锻造” — client-half Cordis plugin.
 *
 * A “forge furnace” panel rendered in the active tool card slot
 * (`tool.view.cordis`, key `self`). It shows live trace statistics, the list
 * of forged skills, and a button that manually forges the most recent
 * completed session through the package-private `forge/analyze` RPC.
 *
 * Plain JavaScript + React.createElement only — no JSX, no TS, no imports.
 */

export const name = 'dsh-forge'

export function apply(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  slots.inject('tool.view.cordis', () => slots.register(
    { name: 'tool.view.cordis', key: 'self' },
    () => {
      const [status, setStatus] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState('')

      const refresh = () => {
        host.call('forge/status', {})
          .then(setStatus)
          .catch((e) => setMsg('status error: ' + String(e && e.message || e)))
      }

      React.useEffect(() => { refresh() }, [])

      const forge = () => {
        setBusy(true)
        setMsg('')
        host.call('forge/analyze', {})
          .then((r) => {
            setMsg(r && r.forged
              ? '锻造成功: ' + r.forged.name + ' — ' + r.forged.description
              : (r && r.error) || '锻造无结果')
            refresh()
          })
          .catch((e) => setMsg('forge error: ' + String(e && e.message || e)))
          .finally(() => setBusy(false))
      }

      const card = (label, value, color) => React.createElement(
        'div',
        { style: { padding: '6px 10px', borderRadius: 8, background: 'color-mix(in srgb, ' + color + ' 12%, transparent)', border: '1px solid ' + color, fontSize: 12 } },
        React.createElement('div', { style: { opacity: 0.65, fontSize: 11 } }, label),
        React.createElement('div', { style: { fontWeight: 600 } }, String(value)),
      )
      const row = (children) => React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, children)

      const s = status || {}
      const sessions = s.sessions || []
      const forged = s.forged || []

      return React.createElement(
        'div',
        { style: { padding: 14, fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement('div', { style: { fontSize: 15, fontWeight: 700 } }, '🔨 dsh-forge 技能锻造炉'),
        React.createElement('div', { style: { fontSize: 12, opacity: 0.7 } },
          '监听会话事件流 → 识别重复成功任务 → 自动锻造可复用 skill。宿主级运行时进化。'),
        row([
          card('已追踪会话', (s.totalTraced || 0), '#4dabf7'),
          card('已锻造技能', forged.length, '#69db7c'),
          card('状态', (s.totalTraced ? '监听中' : '等待事件'), '#ffd43b'),
        ]),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement('button', {
            onClick: forge,
            disabled: busy,
            style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#2f9e44', color: '#fff', cursor: busy ? 'wait' : 'pointer', fontWeight: 600 },
          }, busy ? '锻造中…' : '⚒ 锻造当前会话'),
          React.createElement('button', {
            onClick: refresh,
            style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #ced4da', background: 'transparent', cursor: 'pointer' },
          }, '刷新'),
        ),
        msg ? React.createElement('div', {
          style: { fontSize: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(47,158,68,0.08)', border: '1px solid #2f9e44' },
        }, msg) : null,
        forged.length ? React.createElement('div', { style: { fontSize: 12 } },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 4 } }, '已锻造技能'),
          forged.map((f) => React.createElement('div', { key: f.name, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #69db7c', marginBottom: 4 } },
            '✅ ' + f.name + ' — ' + f.description)),
        ) : null,
        sessions.length ? React.createElement('div', { style: { fontSize: 12 } },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 4 } }, '会话轨迹'),
          sessions.slice(-8).map((x) => React.createElement('div', { key: x.sessionId, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #4dabf7', marginBottom: 4 } },
            React.createElement('div', {}, (x.done ? '✅ ' : '⏳ ') + String(x.sessionId).slice(0, 24) + ' · ' + x.toolCount + ' 次工具调用 · ' + x.turns + ' 轮'),
            x.intents.length ? React.createElement('div', { style: { opacity: 0.65 } }, '意图: ' + x.intents.slice(-1).join(' | ').slice(0, 90)) : null,
          ))) : null,
      )
    },
  ))
}