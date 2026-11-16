import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
import { useConfig } from '../config'
import { db } from '../db'
import { FIELD_LABEL, buildGroupShareText, type ShareableField } from '../lib/privacy'
import { useProfile } from '../lib/profile'
import { useSermons } from '../lib/sermons'
import { currentWeek, fmtDate, parseDate } from '../lib/split'

/** 목장 나눔: 이번 주 나눔 질문 + 내가 고른 칸만 담은 텍스트. 기도는 선택지 자체가 없음 */
export default function Mokjang() {
  const cfg = useConfig()
  const profile = useProfile()
  const { sermons } = useSermons()
  const [pick, setPick] = useState<string | undefined>()
  const sermon = sermons.find((s) => s.id === pick) ?? currentWeek(sermons).sermon
  const meds = useLiveQuery(() => (sermon ? db.meditations.where('sermonId').equals(sermon.id).toArray() : []), [sermon?.id], [])
  const senior = !!profile?.seniorMode
  const options: ShareableField[] = senior ? ['remembered', 'observe', 'apply'] : ['observe', 'interpret', 'apply', 'remembered']
  const [fields, setFields] = useState<ShareableField[] | null>(null)
  const chosen = fields ?? (senior ? ['remembered'] : ['observe', 'apply'])
  const [msg, setMsg] = useState('')

  const text = sermon ? buildGroupShareText({ sermon, meditations: meds, fields: chosen, name: profile?.name, appName: cfg.appName }) : ''
  const toggle = (f: ShareableField) => setFields(chosen.includes(f) ? chosen.filter((x) => x !== f) : [...chosen, f])
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); flash('복사했어요. 카카오톡 목장방에 붙여 넣으세요.') }
    catch { flash('복사하지 못했어요. 아래 글을 길게 눌러 복사해 주세요.') }
  }
  const share = async () => {
    try { await navigator.share({ text }) } catch { /* 사용자가 취소 */ }
  }

  return (
    <div className="min-h-dvh">
      <TopBar title="🌿 목장 나눔" />
      <main className="page">
        {!sermon && <p className="card text-ink-500">아직 등록된 설교가 없어요.</p>}
        {sermon && (
          <>
            <section className="card">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs text-moss-600">{fmtDate(parseDate(sermon.date))} 주일</p>
                  <h2 className="font-serif text-lg font-bold">{sermon.title}</h2>
                  <p className="text-sm text-ink-500">{sermon.passage}</p>
                </div>
                {sermons.length > 1 && (
                  <select aria-label="주 선택" className="rounded-full border border-moss-200 bg-white px-2 py-1 text-xs"
                    value={sermon.id} onChange={(e) => setPick(e.target.value)}>
                    {[...sermons].reverse().map((s) => <option key={s.id} value={s.id}>{fmtDate(parseDate(s.date))}</option>)}
                  </select>
                )}
              </div>
              {sermon.groupQuestions?.length ? (
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
                  {sermon.groupQuestions.map((q) => <li key={q}>{q}</li>)}
                </ol>
              ) : <p className="mt-3 text-sm text-ink-500">이번 주 나눔 질문이 아직 없어요. 한 주 동안 마음에 남은 말씀을 나눠 보세요.</p>}
            </section>

            <section className="card space-y-3">
              <h2 className="font-semibold">✍️ 내 묵상에서 나눌 칸 고르기</h2>
              <div className="flex flex-wrap gap-2">
                {options.map((f) => (
                  <button key={f} onClick={() => toggle(f)} aria-pressed={chosen.includes(f)}
                    className={`chip ${chosen.includes(f) ? 'border-moss-500 bg-moss-100 text-moss-700' : 'border-moss-200 text-ink-500'}`}>
                    {chosen.includes(f) ? '✓ ' : ''}{FIELD_LABEL[f]}
                  </button>
                ))}
              </div>
              <p className="rounded-xl bg-dawn-50 px-3 py-2 text-xs text-dawn-700">🔒 기도 칸은 언제나 나만 봐요. 나눔 글에는 들어가지 않아요.</p>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-moss-50 p-4 font-sans text-sm leading-relaxed text-ink-700">{text}</pre>
              <div className="flex gap-2">
                <button className="btn-primary flex-1" onClick={copy}>📋 복사하기</button>
                {'share' in navigator && <button className="btn-ghost flex-1" onClick={share}>공유하기</button>}
              </div>
              {msg && <p className="text-center text-sm text-moss-700" role="status">{msg}</p>}
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
