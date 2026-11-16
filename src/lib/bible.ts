import { BOOKS } from '../data/books'
import type { Ref, VersePos } from '../db'

/** 성경전서 개역한글판 (대한성서공회) — 퍼블릭 도메인. 본문은 원문 그대로 사용 */
export const BIBLE_CREDIT = '성경전서 개역한글판 (대한성서공회) · 퍼블릭 도메인'

const ALIASES: Record<string, number> = {
  // '요1' 같은 약칭은 '요 15:1'(요한복음)과 겹치므로 넣지 않음
  요한1서: 62, 요한2서: 63, 요한3서: 64,
  계시록: 66, 시: 19, 살전서: 52, 살후서: 53,
}
const NAMES: { key: string; no: number }[] = [
  ...BOOKS.flatMap((b) => [{ key: b.name, no: b.no }, { key: b.abbr, no: b.no }]),
  ...Object.entries(ALIASES).map(([key, no]) => ({ key, no })),
].sort((a, b) => b.key.length - a.key.length) // 긴 이름부터 맞춰야 '요나'가 '요'로 잘못 잡히지 않음

export const bookMeta = (no: number) => BOOKS[no - 1]
export const chapterLen = (book: number, c: number) => BOOKS[book - 1]?.verses[c - 1] ?? 0

/**
 * '요한복음 15:1-17', '요 15:1~17', '요한복음 15:1-16:4', '시편 23', '시 23-24', '요한복음 15장 1-17절' 을 읽음.
 * 실패하면 null.
 */
export function parseRef(input: string): Ref | null {
  const s = input
    .replace(/\s+/g, '')
    .replace(/[~–—]/g, '-')
    .replace(/(\d+)장(\d+)/g, '$1:$2')
    .replace(/[장절]/g, '')
  const hit = NAMES.find((n) => s.startsWith(n.key) && /^\d/.test(s.slice(n.key.length)))
  if (!hit) return null
  const book = hit.no
  const m = s.slice(hit.key.length).match(/^(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/)
  if (!m) return null
  const [, c1s, v1s, xs, ys] = m
  const c1 = +c1s
  if (!chapterLen(book, c1)) return null
  let from: VersePos, to: VersePos
  if (v1s === undefined) {
    // 장 단위: '시 23' 또는 '시 23-24'
    const c2 = xs ? +xs : c1
    if (ys !== undefined || !chapterLen(book, c2) || c2 < c1) return null
    from = { c: c1, v: 1 }; to = { c: c2, v: chapterLen(book, c2) }
  } else {
    from = { c: c1, v: +v1s }
    if (xs === undefined) to = { ...from }
    else if (ys === undefined) to = { c: c1, v: +xs }        // 15:1-17
    else to = { c: +xs, v: +ys }                              // 15:1-16:4
  }
  if (from.v < 1 || from.v > chapterLen(book, from.c)) return null
  if (!chapterLen(book, to.c) || to.v < 1) return null
  to.v = Math.min(to.v, chapterLen(book, to.c))
  if (cmp(to, from) < 0) return null
  return { book, from, to }
}

export const cmp = (a: VersePos, b: VersePos) => (a.c - b.c) || (a.v - b.v)

/** 범위 안의 모든 절 위치를 순서대로 펼침 (장 넘김 포함) */
export function expandRef(ref: Ref): VersePos[] {
  const out: VersePos[] = []
  for (let c = ref.from.c; c <= ref.to.c; c++) {
    const first = c === ref.from.c ? ref.from.v : 1
    const last = c === ref.to.c ? ref.to.v : chapterLen(ref.book, c)
    for (let v = first; v <= last; v++) out.push({ c, v })
  }
  return out
}

export function formatRef(ref: Ref, short = false): string {
  const b = bookMeta(ref.book)
  const name = short ? b.abbr : b.name
  const { from: f, to: t } = ref
  const whole = f.v === 1 && t.v === chapterLen(ref.book, t.c)
  if (whole && f.c === t.c) return `${name} ${f.c}장`
  if (whole) return `${name} ${f.c}-${t.c}장`
  if (f.c === t.c) return f.v === t.v ? `${name} ${f.c}:${f.v}` : `${name} ${f.c}:${f.v}-${t.v}`
  return `${name} ${f.c}:${f.v}-${t.c}:${t.v}`
}

const bookCache = new Map<number, Promise<string[][]>>()
function loadBook(no: number) {
  let p = bookCache.get(no)
  if (!p) {
    p = fetch(`./bible/krv/${String(no).padStart(2, '0')}.json`).then((r) => {
      if (!r.ok) throw new Error('본문을 불러오지 못했어요')
      return r.json() as Promise<string[][]>
    })
    p.catch(() => bookCache.delete(no))
    bookCache.set(no, p)
  }
  return p
}

export interface Verse extends VersePos { text: string }

export async function getVerses(ref: Ref): Promise<Verse[]> {
  const chapters = await loadBook(ref.book)
  return expandRef(ref).map((p) => ({ ...p, text: chapters[p.c - 1]?.[p.v - 1] ?? '' }))
}
