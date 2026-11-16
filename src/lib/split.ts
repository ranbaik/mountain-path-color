import type { DayPlan, Ref, Sermon, Weekday } from '../db'
import { expandRef, parseRef } from './bible'

export const WEEKDAYS: { key: Weekday; label: string; short: string; focus: string }[] = [
  { key: 1, label: '월요일', short: '월', focus: '천천히 읽고, 눈에 들어오는 단어와 장면을 적어 보세요.' },
  { key: 2, label: '화요일', short: '화', focus: '이 말씀이 하나님에 대해 무엇을 알려 주는지 생각해 보세요.' },
  { key: 3, label: '수요일', short: '수', focus: '나는 이 말씀 앞에서 어떤 모습인지 비추어 보세요.' },
  { key: 4, label: '목요일', short: '목', focus: '오늘 하루, 이 말씀대로 살아 볼 한 가지를 정해 보세요.' },
  { key: 5, label: '금요일', short: '금', focus: '한 주를 돌아보며 감사와 결단을 드려요.' },
  { key: 6, label: '토요일', short: '토', focus: '한 주 동안 받은 말씀을 떠올리며 천천히 읽어요.' },
  { key: 7, label: '주일', short: '일', focus: '예배를 기대하며, 오늘 말씀으로 마음을 준비해요.' },
]
/** 자동 분할에 쓰는 월~금 */
const WORKDAYS = WEEKDAYS.slice(0, 5)

/**
 * 본문 범위를 월~금 5일로 나눔.
 * - 5절 이상: 앞에서부터 연속 구간으로 최대한 고르게 (남는 절은 앞쪽 날에 1절씩 더)
 * - 5절 미만: 같은 본문을 매일 묵상하되 요일별 초점만 달리 함
 */
export function splitRef(ref: Ref): DayPlan[] {
  const verses = expandRef(ref)
  const n = verses.length
  if (n < 5) return WORKDAYS.map((d) => ({ weekday: d.key, ref, focus: d.focus }))
  const base = Math.floor(n / 5), extra = n % 5
  const plans: DayPlan[] = []
  let i = 0
  for (const d of WORKDAYS) {
    const size = base + (d.key <= extra ? 1 : 0)
    plans.push({ weekday: d.key, ref: { book: ref.book, from: verses[i], to: verses[i + size - 1] }, focus: d.focus })
    i += size
  }
  return plans
}

/** 요일별 본문이 저장돼 있으면 그것을(요일 순), 없으면 월~금 자동 분할 */
export function dayPlans(sermon: Sermon): DayPlan[] | null {
  if (sermon.days?.length) return [...sermon.days].sort((a, b) => a.weekday - b.weekday)
  const ref = parseRef(sermon.passage)
  return ref ? splitRef(ref) : null
}

/* ── 날짜 (모두 기기 현지 시각 기준) ── */

export function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** 설교(주일) 기준 요일 날짜: 월=+1 … 금=+5, 토=+6, 다음 주일=+7 */
export const dayDate = (sermon: Sermon, weekday: Weekday) => addDays(parseDate(sermon.date), weekday)

export const fmtDate = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`

/**
 * 오늘 묵상할 주와 요일.
 * 1) 오늘 날짜의 본문이 있는 주를 먼저 찾음 (토·주일까지 있는 주는 다음 주일과 겹치므로 이 순서가 중요)
 * 2) 없으면 오늘이 속한 주(주일~토요일)의 설교, 그것도 없으면 가장 최근(또는 첫) 설교 — 이때 요일은 null
 */
export function currentWeek(sermons: Sermon[], today = new Date()) {
  const t = toYmd(today)
  const diffOf = (s: Sermon) => Math.round((parseDate(t).getTime() - parseDate(s.date).getTime()) / 86400000)
  const desc = [...sermons].sort((a, b) => b.date.localeCompare(a.date))
  for (const s of desc) {
    const d = diffOf(s)
    if (d >= 1 && d <= 7 && dayPlans(s)?.some((p) => p.weekday === d)) return { sermon: s, weekday: d as Weekday, inWeek: true }
  }
  const sermon = desc.find((s) => s.date <= t) ?? desc.at(-1)
  if (!sermon) return { sermon: undefined, weekday: null as Weekday | null, inWeek: false }
  const diff = diffOf(sermon)
  return { sermon, weekday: null as Weekday | null, inWeek: diff >= 0 && diff <= 6 }
}
