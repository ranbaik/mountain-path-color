import type { Meditation, Sermon } from '../db'
import { formatRef } from './bible'
import { WEEKDAYS, dayPlans } from './split'

/**
 * 기도(prayer)는 어떤 공유·내보내기·인쇄에도 들어가지 않는다. (기기 안 백업 파일만 예외)
 * 빼는 방식(blocklist)이 아니라 **허용한 칸만 골라 담는 방식(allowlist)** 이라,
 * 나중에 Meditation 에 칸이 늘어도 여기서 허용하지 않으면 절대 밖으로 나가지 않음.
 */
export const SHAREABLE_FIELDS = ['observe', 'interpret', 'apply', 'remembered'] as const
export type ShareableField = (typeof SHAREABLE_FIELDS)[number]
export type Shareable = Pick<Meditation, 'weekday'> & Partial<Record<ShareableField, string>>

export const FIELD_LABEL: Record<ShareableField, string> = {
  observe: '관찰', interpret: '해석', apply: '적용', remembered: '마음에 남은 말씀',
}

export function toShareable(m: Meditation, fields: readonly ShareableField[] = SHAREABLE_FIELDS): Shareable {
  const out: Shareable = { weekday: m.weekday }
  for (const f of fields) {
    if (!(SHAREABLE_FIELDS as readonly string[]).includes(f)) continue // 허용 목록 밖은 무시
    const v = m[f]
    if (typeof v === 'string' && v.trim()) out[f] = v.trim()
  }
  return out
}

/** 목장 나눔용 텍스트 (카카오톡 붙여넣기 / 공유). 기도는 들어가지 않음 */
export function buildGroupShareText(opts: {
  sermon: Sermon
  meditations: Meditation[]
  fields: readonly ShareableField[]
  name?: string
  appName: string
}): string {
  const { sermon, meditations, fields, name, appName } = opts
  const plans = dayPlans(sermon)
  const lines: string[] = [`📖 ${sermon.title} (${sermon.passage})`]
  if (name) lines.push(`— ${name}님의 한 주 묵상`)
  const items = [...meditations]
    .sort((a, b) => a.weekday - b.weekday)
    .map((m) => toShareable(m, fields))
    .filter((s) => fields.some((f) => s[f]))
  for (const s of items) {
    const day = WEEKDAYS[s.weekday - 1]
    const plan = plans?.find((p) => p.weekday === s.weekday)
    lines.push('', `[${day.label}${plan ? ` · ${formatRef(plan.ref, true)}` : ''}]`)
    for (const f of fields) if (s[f]) lines.push(`${FIELD_LABEL[f]}: ${s[f]}`)
  }
  if (!items.length) lines.push('', '(이번 주 나눌 내용을 아직 고르지 않았어요)')
  if (sermon.groupQuestions?.length) {
    lines.push('', '💬 함께 나눌 질문')
    sermon.groupQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
  }
  lines.push('', `— ${appName}`)
  return lines.join('\n')
}
