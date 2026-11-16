import { useEffect, useRef, useState } from 'react'
import { db, emptyMeditation, medId, type Meditation, type Weekday } from '../db'

type Field = 'observe' | 'interpret' | 'apply' | 'remembered' | 'prayer'

const FULL: { key: Field; label: string; hint: string }[] = [
  { key: 'observe', label: '👀 관찰', hint: '본문에서 무엇이 보이나요? 반복되는 말, 인물, 장면을 적어요.' },
  { key: 'interpret', label: '💡 해석', hint: '이 말씀은 하나님에 대해, 나에 대해 무엇을 말하나요?' },
  { key: 'apply', label: '👣 적용', hint: '오늘 이 말씀대로 살아 볼 한 가지는?' },
  { key: 'prayer', label: '🙏 기도', hint: '말씀을 붙들고 드리는 나의 기도' },
]
const SENIOR: { key: Field; label: string; hint: string }[] = [
  { key: 'remembered', label: '💌 마음에 남은 말씀', hint: '가장 마음에 남은 구절이나 단어를 적어 보세요.' },
  { key: 'prayer', label: '🙏 기도 한 줄', hint: '짧게 한 줄로 기도해 보세요.' },
]

/** 묵상 카드. 0.5초 뒤 자동 저장, 화면을 떠날 때도 저장. 기도 칸은 비공개(🔒) */
export default function MeditationCard({ sermonId, weekday, senior }: { sermonId: string; weekday: Weekday; senior: boolean }) {
  const id = medId(sermonId, weekday)
  const [m, setM] = useState<Meditation | null>(null)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const latest = useRef<Meditation | null>(null)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    setM(null); setSaved('idle')
    db.meditations.get(id).then((x) => {
      if (!alive) return
      const v = x ?? emptyMeditation(sermonId, weekday)
      latest.current = v; setM(v)
    })
    return () => {
      alive = false
      window.clearTimeout(timer.current)
      if (dirty.current && latest.current) { db.meditations.put(latest.current); dirty.current = false }
    }
  }, [id, sermonId, weekday])

  if (!m) return <div className="card animate-pulse text-sm text-ink-500">묵상 카드를 펴는 중…</div>

  const update = (patch: Partial<Meditation>) => {
    const next = { ...m, ...patch, updatedAt: Date.now() }
    setM(next); latest.current = next; dirty.current = true
    setSaved('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      await db.meditations.put(next); dirty.current = false; setSaved('saved')
    }, 500)
  }

  const fields = senior ? SENIOR : FULL
  return (
    <section className="card space-y-4" aria-label="묵상 카드">
      <div className="flex items-center">
        <h2 className="flex-1 font-serif text-lg font-bold">📝 묵상 카드</h2>
        <span className="text-xs text-ink-500" aria-live="polite">{saved === 'saving' ? '저장 중…' : saved === 'saved' ? '✓ 기기에 저장됨' : ''}</span>
      </div>
      {fields.map((f) => {
        const isPrayer = f.key === 'prayer'
        return (
          <div key={f.key} className={isPrayer ? 'private rounded-2xl bg-dawn-50 p-3 -mx-1' : ''}>
            <label className="field-label flex items-center gap-1.5" htmlFor={`f-${f.key}`}>
              {f.label}
              {isPrayer && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-dawn-700">🔒 나만 봐요 · 공유되지 않아요</span>}
            </label>
            <textarea id={`f-${f.key}`} className="field min-h-[5.5rem] resize-y" rows={senior ? 3 : 3}
              placeholder={f.hint} value={m[f.key]} autoComplete="off" spellCheck={false}
              onChange={(e) => update({ [f.key]: e.target.value })} />
          </div>
        )
      })}
      <button onClick={() => update({ done: !m.done })}
        className={`w-full rounded-full py-3.5 font-semibold transition ${m.done ? 'bg-moss-100 text-moss-700' : 'bg-moss-600 text-white shadow-card'}`}>
        {m.done ? '✓ 오늘 묵상을 마쳤어요 (다시 누르면 취소)' : '오늘 묵상 마치기'}
      </button>
    </section>
  )
}
