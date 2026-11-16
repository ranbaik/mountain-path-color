import { useEffect, useState } from 'react'
import type { Ref } from '../db'
import { BIBLE_CREDIT, formatRef, getVerses, type Verse } from '../lib/bible'

/** 개역한글 본문 표시 (장이 바뀌면 장 번호도 표시) */
export default function Passage({ refRange, compact }: { refRange: Ref; compact?: boolean }) {
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
  return (
    <div>
      <p className={`scripture ${compact ? '!text-base' : ''}`}>
        {verses.map((v, i) => (
          <span key={`${v.c}:${v.v}`}>
            {multi && (i === 0 || v.v === 1) && <span className="mt-2 block text-xs font-semibold text-moss-600">{v.c}장</span>}
            <sup>{v.v}</sup>{v.text}{' '}
          </span>
        ))}
      </p>
      <p className="mt-2 text-right text-[11px] text-ink-300">{BIBLE_CREDIT}</p>
    </div>
  )
}
