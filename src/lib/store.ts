import { writable, get } from 'svelte/store'
import type { Announcement, Cue, CueGroup, CueStatus, DeskState, Reminder, Session, SessionChange, Speaker, Term } from './types'

const STORAGE_KEY = 'conference-cue-desk-v1'
const speakers: Speaker[] = [
  { id: 'sp-1', name: 'Dr. Maya Chen', title: '首席气候科学家', language: '英语 → 中文', color: '#0f766e' },
  { id: 'sp-2', name: '刘启明', title: '城市韧性研究员', language: '中文 → 英语', color: '#b45309' },
  { id: 'sp-3', name: 'Prof. Daniel Ortiz', title: '公共卫生政策顾问', language: '西班牙语 → 中文', color: '#6d28d9' },
  { id: 'sp-4', name: '佐藤 美咲', title: '社区能源设计师', language: '日语 → 中文', color: '#be123c' }
]
const sessions: Session[] = [
  { id: 'se-1', order: 1, time: '09:00', title: '开幕式与议程说明', speakerId: 'sp-2', room: '主会场 A', status: 'done' },
  { id: 'se-2', order: 2, time: '09:20', title: '城市热岛与适应性基础设施', speakerId: 'sp-1', room: '主会场 A', status: 'live' },
  { id: 'se-3', order: 3, time: '10:05', title: '社区健康数据的地方行动', speakerId: 'sp-3', room: '主会场 A', status: 'upcoming' },
  { id: 'se-4', order: 4, time: '10:45', title: '分布式能源与社区共治', speakerId: 'sp-4', room: '主会场 A', status: 'upcoming' }
]
const terms: Term[] = [
  { id: 'term-1', source: 'urban heat island', target: '城市热岛', note: '首次出现完整译出，后可简称热岛', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-2', source: 'resilience', target: '韧性', note: '不使用“恢复力”', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-3', source: 'co-benefit', target: '协同效益', note: '环境与健康共同收益', speakerId: 'sp-1', priority: 'normal' },
  { id: 'term-4', source: 'distributed energy resource', target: '分布式能源资源', note: '缩写 DER', speakerId: 'sp-4', priority: 'high' },
  { id: 'term-5', source: 'health equity', target: '健康公平', note: '不译为健康平等', speakerId: 'sp-3', priority: 'high' }
]
function initialCues(): Cue[] {
  const now = Date.now()
  return [
    { id: 'cue-101', speakerId: 'sp-1', sessionId: 'se-2', text: 'The urban heat island effect is not evenly distributed across a city.', receivedAt: now - 36000, status: 'confirmed', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['城市热岛'] },
    { id: 'cue-102', speakerId: 'sp-1', sessionId: 'se-2', text: 'Neighborhoods with less tree canopy can be several degrees warmer at night.', receivedAt: now - 19000, status: 'confirmed', manual: false, offline: false, delaySeconds: 6, duplicateOf: null, followupText: '补译：“夜间温差可达数摄氏度。”', tags: ['树冠覆盖率'] },
    { id: 'cue-103', speakerId: 'sp-1', sessionId: 'se-2', text: 'Our resilience strategy links cooling corridors with public health investments.', receivedAt: now - 9000, status: 'pending', manual: false, offline: false, delaySeconds: 11, duplicateOf: null, followupText: '', tags: ['韧性', '协同效益'] },
    { id: 'cue-104', speakerId: 'sp-1', sessionId: 'se-2', text: 'That data also reveals health equity gaps between districts.', receivedAt: now - 2500, status: 'pending', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['健康公平'] }
  ]
}
function demoState(): DeskState {
  return {
    speakers, sessions, agendaDraft: null, terms, cues: initialCues(), reminders: [], activeCueId: 'cue-103', fontScale: 100,
    announcements: [
      { id: 'ann-1', level: 'info', text: '十点整有消防联动测试，请提醒会场人员保持镇定。', visibleOnStage: false, createdAt: new Date().toISOString() },
      { id: 'ann-2', level: 'urgent', text: '请下一位发言人提前到侧台候场。', visibleOnStage: false, createdAt: new Date().toISOString() }
    ],
    online: true, liveSimulation: true, updatedAt: new Date().toISOString()
  }
}
function clone<T>(value: T): T { return structuredClone(value) }
function migrate(state: DeskState): DeskState {
  const liveId = state.sessions.find(item => item.status === 'live')?.id || state.sessions[0]?.id || ''
  state.cues.forEach(cue => { if (!cue.sessionId) cue.sessionId = liveId })
  if (typeof state.agendaDraft === 'undefined') state.agendaDraft = null
  return state
}
function loadState(): DeskState {
  if (typeof localStorage === 'undefined') return demoState()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? migrate({ ...demoState(), ...JSON.parse(saved), online: navigator.onLine }) : demoState()
  } catch { return demoState() }
}
const history: DeskState[] = []
const future: DeskState[] = []
export const desk = writable<DeskState>(loadState())

function persist(state: DeskState) {
  state.updatedAt = new Date().toISOString()
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
function commit(recipe: (state: DeskState) => void) {
  const current = clone(get(desk))
  const next = clone(current)
  recipe(next)
  history.push(current)
  if (history.length > 60) history.shift()
  future.length = 0
  persist(next)
  desk.set(next)
}
export function undoDesk() {
  const previous = history.pop()
  if (!previous) return
  future.push(clone(get(desk)))
  desk.set(previous); persist(previous)
}
export function redoDesk() {
  const next = future.pop()
  if (!next) return
  history.push(clone(get(desk)))
  desk.set(next); persist(next)
}
export const canUndo = () => history.length > 0
export const canRedo = () => future.length > 0

export function addSpeaker() {
  commit(state => state.speakers.push({ id: `sp-${Date.now()}`, name: '新发言人', title: '待填写机构与职务', language: '待设置语言方向', color: '#475569' }))
}
export function updateSpeaker(id: string, patch: Partial<Speaker>) { commit(state => { const item = state.speakers.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
const SESSION_FIELDS: (keyof Session)[] = ['order', 'time', 'title', 'speakerId', 'room', 'status']
function ensureDraft(state: DeskState): Session[] {
  if (!state.agendaDraft) state.agendaDraft = { sessions: clone(state.sessions), savedAt: new Date().toISOString() }
  return state.agendaDraft.sessions
}
export function agendaChanges(state: DeskState): SessionChange[] {
  const draft = state.agendaDraft?.sessions
  if (!draft) return []
  const changes: SessionChange[] = []
  draft.forEach(item => {
    const base = state.sessions.find(row => row.id === item.id)
    if (!base) { changes.push({ id: item.id, kind: 'added', fields: [...SESSION_FIELDS] }); return }
    const fields = SESSION_FIELDS.filter(field => base[field] !== item[field])
    changes.push({ id: item.id, kind: fields.length ? 'modified' : 'same', fields })
  })
  state.sessions.forEach(item => { if (!draft.some(row => row.id === item.id)) changes.push({ id: item.id, kind: 'removed', fields: [] }) })
  return changes
}
export function draftChangeCount(state: DeskState): number { return agendaChanges(state).filter(item => item.kind !== 'same').length }
function pruneDraft(state: DeskState) {
  if (state.agendaDraft && !draftChangeCount(state)) state.agendaDraft = null
}
function touchDraft(state: DeskState) { if (state.agendaDraft) state.agendaDraft.savedAt = new Date().toISOString() }
export function updateDraftSession(id: string, patch: Partial<Session>) {
  commit(state => {
    const item = ensureDraft(state).find(row => row.id === id)
    if (item) Object.assign(item, patch)
    touchDraft(state); pruneDraft(state)
  })
}
export function addDraftSession() {
  commit(state => {
    const draft = ensureDraft(state)
    draft.push({ id: `se-${Date.now()}`, order: Math.max(0, ...draft.map(item => item.order)) + 1, time: '11:30', title: '新演讲', speakerId: state.speakers[0]?.id || '', room: '主会场 A', status: 'upcoming' })
    touchDraft(state)
  })
}
export function removeDraftSession(id: string): boolean {
  if (get(desk).cues.some(cue => cue.sessionId === id)) return false
  commit(state => {
    const draft = ensureDraft(state)
    state.agendaDraft!.sessions = draft.filter(item => item.id !== id)
    touchDraft(state); pruneDraft(state)
  })
  return true
}
export function restoreDraftSession(id: string) {
  commit(state => {
    const base = state.sessions.find(item => item.id === id)
    if (!base) return
    const draft = ensureDraft(state)
    if (!draft.some(item => item.id === id)) draft.push(clone(base))
    touchDraft(state); pruneDraft(state)
  })
}
export function publishAgenda() {
  commit(state => {
    if (!state.agendaDraft) return
    const next = clone(state.agendaDraft.sessions)
    const liveOnes = next.filter(item => item.status === 'live').sort((a, b) => a.order - b.order)
    liveOnes.slice(1).forEach(item => { item.status = 'upcoming' })
    state.sessions = next
    state.agendaDraft = null
  })
}
export function discardAgendaDraft() { commit(state => { state.agendaDraft = null }) }
export function cueGroups(state: DeskState): CueGroup[] {
  const liveId = state.sessions.find(item => item.status === 'live')?.id
  const bySession = new Map<string, Cue[]>()
  state.cues.forEach(cue => {
    const list = bySession.get(cue.sessionId) || []
    list.push(cue)
    bySession.set(cue.sessionId, list)
  })
  const groups: CueGroup[] = []
  bySession.forEach((cues, sessionId) => {
    const session = state.sessions.find(item => item.id === sessionId)
    groups.push({
      sessionId, cues,
      title: session?.title || '已移除场次',
      time: session?.time || '--:--',
      order: session?.order ?? 999,
      isLive: sessionId === liveId,
      known: Boolean(session),
      openCount: cues.filter(cue => cue.status !== 'confirmed').length
    })
  })
  return groups.sort((a, b) => a.order - b.order)
}
export function addTerm() { commit(state => state.terms.push({ id: `term-${Date.now()}`, source: 'new term', target: '新术语', note: '', speakerId: state.speakers[0]?.id || '', priority: 'normal' })) }
export function updateTerm(id: string, patch: Partial<Term>) { commit(state => { const item = state.terms.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addAnnouncement(text: string, level: Announcement['level']) {
  if (!text.trim()) return
  commit(state => state.announcements.unshift({ id: `ann-${Date.now()}`, level, text: text.trim(), visibleOnStage: false, createdAt: new Date().toISOString() }))
}
export function publishAnnouncement(id: string, visible: boolean) { commit(state => { const item = state.announcements.find(row => row.id === id); if (item) item.visibleOnStage = visible }) }

export function setOnline(online: boolean) {
  commit(state => {
    state.online = online
    if (online) {
      state.cues.forEach(cue => {
        if (cue.offline) {
          cue.offline = false
          const duplicate = findDuplicate(cue.text, state.cues.filter(item => item.id !== cue.id && !item.offline))
          cue.duplicateOf = duplicate?.id || null
        }
      })
    }
  })
}
export function setLiveSimulation(enabled: boolean) { commit(state => { state.liveSimulation = enabled }) }
export function setActiveCue(id: string) { commit(state => { state.activeCueId = id }) }
export function moveCue(direction: 1 | -1, scope?: string[]) {
  const state = get(desk)
  const pool = scope && scope.length ? scope : state.cues.map(item => item.id)
  const index = pool.indexOf(state.activeCueId)
  if (index === -1) {
    const fallback = direction === 1 ? pool[0] : pool.at(-1)
    if (fallback) setActiveCue(fallback)
    return
  }
  const next = pool[index + direction]
  if (next) setActiveCue(next)
}
export function setFontScale(scale: number) { commit(state => { state.fontScale = Math.min(150, Math.max(85, scale)) }) }

export function ingestCue(text: string, options: { manual?: boolean; speakerId?: string; receivedAt?: number } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return
  commit(state => {
    const existing = state.cues.filter(item => item.text !== trimmed)
    const duplicate = findDuplicate(trimmed, existing)
    const liveSession = state.sessions.find(item => item.status === 'live')
    const speakerId = options.speakerId || liveSession?.speakerId || state.speakers[0]?.id || ''
    const receivedAt = options.receivedAt || Date.now()
    const cue: Cue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, speakerId, sessionId: liveSession?.id || state.sessions[0]?.id || '', text: trimmed, receivedAt,
      status: 'pending', manual: Boolean(options.manual), offline: !state.online, delaySeconds: Math.max(0, Math.round((Date.now() - receivedAt) / 1000)),
      duplicateOf: duplicate?.id || null, followupText: '', tags: detectTerms(trimmed, state.terms)
    }
    state.cues.push(cue); state.activeCueId = cue.id
  })
}
export function updateCue(id: string, patch: Partial<Cue>) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) Object.assign(cue, patch) }) }
export function setCueStatus(id: string, status: CueStatus) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.status = status }) }
export function deleteCue(id: string) { commit(state => { state.cues = state.cues.filter(item => item.id !== id); if (state.activeCueId === id) state.activeCueId = state.cues.at(-1)?.id || '' }) }
export function clearDuplicate(id: string) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.duplicateOf = null }) }
export function sendReminder(termId: string, cueId: string) {
  commit(state => {
    const exists = state.reminders.some(item => item.termId === termId && item.cueId === cueId)
    if (exists) return
    state.reminders.unshift({ id: `rem-${Date.now()}`, termId, cueId, target: state.terms.find(item => item.id === termId)?.target || '', createdAt: Date.now(), acknowledged: false })
  })
}
export function acknowledgeReminder(id: string) { commit(state => { const item = state.reminders.find(row => row.id === id); if (item) item.acknowledged = true }) }

export function getDelay(cue: Cue, now = Date.now()): number { return Math.max(cue.delaySeconds, Math.round((now - cue.receivedAt) / 1000)) }
export function speakerName(state: DeskState, id: string): string { return state.speakers.find(item => item.id === id)?.name || '未指定' }
export function termTarget(state: DeskState, id: string): string { return state.terms.find(item => item.id === id)?.target || '' }
function detectTerms(text: string, terms: Term[]): string[] {
  const lower = text.toLowerCase()
  return terms.filter(term => lower.includes(term.source.toLowerCase()) || lower.includes(term.target)).map(term => term.target)
}
function findDuplicate(text: string, cues: Cue[]): Cue | undefined {
  return cues.find(cue => similarity(text, cue.text) >= 0.72)
}
function similarity(a: string, b: string): number {
  const grams = (value: string) => {
    const clean = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    return new Set(Array.from({ length: Math.max(0, clean.length - 1) }, (_, index) => clean.slice(index, index + 2)))
  }
  const left = grams(a), right = grams(b)
  if (!left.size || !right.size) return a.trim() === b.trim() ? 1 : 0
  let intersection = 0
  left.forEach(item => { if (right.has(item)) intersection++ })
  return intersection / (left.size + right.size - intersection)
}
