import type { Register } from 'claude-code'

const SERVERS = ['ccd_session_mgmt']
const DEFAULT_KEEP: string[] = []

type Row = { sessionId: string; title: string }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'demo',
      description: 'Demo mode: /demo on | off | status | keep <title text> | unkeep <title text>',
    })
    return next(e)
  })

  on('command.run', { command: 'demo' }, async ($, e) => {
    const call = async (tool: string, args: Record<string, unknown>) => {
      let last = 'no server'
      for (const s of SERVERS) {
        try {
          const r = await $.mcp.call(s, tool, args)
          const text = r.content.map(c => ('text' in c ? String(c.text) : '')).join('')
          if (r.isError) return { ok: false, text }
          return { ok: true, text }
        } catch (err) {
          last = String(err)
        }
      }
      return { ok: false, text: last }
    }
    const list = async (archived: boolean): Promise<Row[]> => {
      const r = await call('list_sessions', { include_archived: archived, limit: 200 })
      if (!r.ok) throw new Error(r.text)
      return JSON.parse(r.text).filter((s: { isArchived: boolean }) => s.isArchived === archived)
    }

    const keep = ((await $.store.get('keep')) as string[] | undefined) ?? DEFAULT_KEEP
    const hidden = ((await $.store.get('hidden')) as string[] | undefined) ?? []
    const [cmd, ...rest] = e.args.trim().split(/\s+/)
    const term = rest.join(' ').toLowerCase()

    try {
      if (cmd === 'on') {
        const rows = await list(false)
        const targets = rows.filter(r => !keep.includes(r.sessionId))
        const done: string[] = [...hidden]
        let failed = 0
        for (const r of targets) {
          const res = await call('archive_session', { session_id: r.sessionId, reason: 'Demo mode on' })
          if (res.ok) done.push(r.sessionId)
          else failed++
          await $.store.set('hidden', done)
        }
        return { text: `Demo mode ON. Hid ${targets.length - failed} chats${failed ? `, ${failed} could not be archived` : ''}. Run /demo off to restore.` }
      }
      if (cmd === 'off') {
        let failed = 0
        const left: string[] = []
        for (const id of hidden) {
          const res = await call('unarchive_session', { session_id: id })
          if (!res.ok) { failed++; left.push(id) }
        }
        await $.store.set('hidden', left)
        return { text: `Demo mode OFF. Restored ${hidden.length - failed} chats${failed ? `, ${failed} failed (run /demo off again)` : ''}.` }
      }
      if (cmd === 'keep' || cmd === 'unkeep') {
        if (!term) return { text: 'Give part of a chat title.' }
        const rows = [...(await list(false)), ...(await list(true))]
        const m = rows.filter(r => r.title.toLowerCase().includes(term))
        if (m.length !== 1) return { text: `${m.length} chats match "${term}"; be more specific.` }
        const next = cmd === 'keep' ? [...new Set([...keep, m[0].sessionId])] : keep.filter(k => k !== m[0].sessionId)
        await $.store.set('keep', next)
        return { text: `${cmd === 'keep' ? 'Will keep' : 'No longer keeping'} "${m[0].title}" visible.` }
      }
      return { text: `Demo mode is ${hidden.length ? 'ON' : 'OFF'}. Keep-list: ${keep.length} chat(s). Hidden: ${hidden.length}.\nUsage: /demo on | off | status | keep <title> | unkeep <title>` }
    } catch (err) {
      return { text: `Demo mode could not reach the app's session tools: ${String(err)}` }
    }
  })
}
