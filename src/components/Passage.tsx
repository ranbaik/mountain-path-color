import { useEffect, useState } from 'react'
import type { Ref } from '../db'
import { BIBLE_CREDIT, formatRef, getVerses, type Verse } from '../lib/bible'
import { saveProfile, useProfile } from '../lib/profile'

/** 본문 글자 배율 단계 (가+ / 가− 로 한 칸씩) */
const BIBLE_SCALES = [0.9, 1, 1.15, 1.3, 1.5, 1.75, 2] as const

/** 성경 본문 위 글자 크기 단추: 가⁺ 가⁻ (설정은 이 기기에 저장, 모든 본문에 같이 적용) */
export function BibleSizeControl() {
  const p = useProfile()
  const cur = p?.bibleScale ?? 1
  const idx = Math.max(0, BIBLE_SCALES.findIndex((s) => s >= cur - 0.001))
  const go = (d: 1 | -1) => saveProfile({ bibleScale: BIBLE_SCALES[Math.min(BIBLE_SCALES.length - 1, Math.max(0, idx + d))] })
  const btn = 'grid h-11 w-12 place-items-center text-ink-700 transition hover:bg-moss-50 active:bg-moss-100 disabled:opacity-30'
  return (
    <div className="no-print flex items-center gap-2">
      <span className="whitespace-nowrap text-xs text-ink-500" aria-live="polite">본문 글자 {Math.round(cur * 100)}%</span>
      <div className="flex overflow-hidden rounded-lg border border-moss-200 bg-white" role="group" aria-label="본문 글자 크기">
        <button type="button" className={btn} onClick={() => go(1)} disabled={idx >= BIBLE_SCALES.length - 1} aria-label="본문 글자 크게">
          <span className="font-sans text-[17px] leading-none">가<sup className="ml-px text-[14px] font-bold text-moss-600">+</sup></span>
        </button>
        <button type="button" className={`${btn} border-l border-moss-200`} onClick={() => go(-1)} disabled={idx <= 0} aria-label="본문 글자 작게">
          <span className="font-sans text-[17px] leading-none">가<sup className="ml-px text-[14px] font-bold text-moss-600">−</sup></span>
        </button>
      </div>
    </div>
  )
}

/** 개역한글 본문: 한 절씩 한 줄(왼쪽 절 번호), 장이 바뀌면 장 제목 */
export default function Passage({ refRange, compact, controls = true }: { refRange: Ref; compact?: boolean; controls?: boolean }) {
  const p = useProfile()
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [err, setErr] = useState('')
  const key = formatRef(refRange)
  useEffect(() => {
    let alive = true
    setVerses(null); setErr('')
    getVerses(refRange).then((v) => alive && setVerses(v), (e: Error) => alive && setErr(e.message))
    return () => { alive = false }
  }, [key]) // 범위가 같으면 다시 불러오지 않음

  if (err) return <p className="text-sm text-dawn-700">본문을 불러올 수 없어요. 인터넷 연결을 확인해 주세요.</p>
  if (!verses) return <p className="animate-pulse text-sm text-ink-500">본문을 펴는 중…</p>
  const multi = refRange.from.c !== refRange.to.c
  const style = { ['--bible-scale' as string]: String(p?.bibleScale ?? 1) }
  return (
    <div>
      {controls && <div className="mb-2 flex justify-end"><BibleSizeControl /></div>}
      <div className={`scripture -mx-2 ${compact ? '!text-base' : ''}`} style={style}>
        {verses.map((v, i) => (
          <div key={`${v.c}:${v.v}`} className="verse">
            {multi && (i === 0 || v.v === 1) && (
              <p className="border-b border-moss-100 pb-1 pt-3 font-sans text-[0.8em] font-semibold text-moss-600">{v.c}장</p>
            )}
            <div className="verse-row">
              <span className="verse-no" aria-label={`${v.c}장 ${v.v}절`}>{v.v}</span>
              <span>{v.text}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-[11px] text-ink-300">{BIBLE_CREDIT}</p>
    </div>
  )
}
