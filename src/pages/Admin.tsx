import { useState } from 'react'
import TopBar from '../components/TopBar'
import { db, type DayPlan, type Sermon, type Weekday } from '../db'
import { expandRef, formatRef, parseRef } from '../lib/bible'
import { byDate, useSermons } from '../lib/sermons'
import { WEEKDAYS, addDays, fmtDate, parseDate, splitRef, toYmd } from '../lib/split'

function nextSunday() {
  const d = new Date()
  return toYmd(addDays(d, (7 - d.getDay()) % 7))
}

interface Form {
  id?: string; date: string; title: string; passage: string; preacher: string; questions: string; family: string
  days: string[] | null      // 요일 본문(월부터 차례로, 1~7일). null = 본문 범위를 월~금 자동 분할
  focus?: (string | undefined)[] // 고치기로 불러온 요일별 안내 문구(예: 성탄절) 유지용
}
const blank = (): Form => ({ date: nextSunday(), title: '', passage: '', preacher: '', questions: '', family: '', days: null })

function fromSermon(s: Sermon): Form {
  return {
    id: s.id, date: s.date, title: s.title, passage: s.passage, preacher: s.preacher,
    questions: (s.groupQuestions ?? []).join('\n'), family: s.familyQuestion ?? '',
    days: s.days ? [...s.days].sort((a, b) => a.weekday - b.weekday).map((d) => formatRef(d.ref)) : null,
    focus: s.days ? [...s.days].sort((a, b) => a.weekday - b.weekday).map((d) => d.focus) : undefined,
  }
}

/**
 * 담당자 화면: 설교를 입력하면 월~금 분할을 미리 보고, 전체 sermons.json 을 내려받음.
 * 서버가 없으므로 실제 반영은 내려받은 파일을 저장소 public/ 폴더에 올려야 함.
 * '이 기기에서 미리 보기'로 저장한 설교는 이 기기에서만 보임.
 */
export default function Admin() {
  const { sermons, feed, drafts } = useSermons()
  const [f, setF] = useState<Form>(blank)
  const [msg, setMsg] = useState('')
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch })

  const ref = parseRef(f.passage)
  const auto = ref ? splitRef(ref) : null
  const dayTexts = f.days ?? auto?.map((p) => formatRef(p.ref)) ?? []
  const dayRefs = dayTexts.map((t) => parseRef(t))
  // 요일 본문은 책이 달라도 됨 (매일 묵상 계획: 예) 월 고후 12장 … 목 시편 20편)
  const daysOk = dayRefs.length >= 1 && dayRefs.length <= 7 && dayRefs.every((r) => r)
  const customized = !!f.days && daysOk && (!auto || dayRefs.length !== auto.length || dayRefs.some((r, i) => formatRef(r!) !== formatRef(auto[i].ref)))
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(f.date) && parseDate(f.date).getDay() === 0 && f.title.trim() && f.passage.trim() && (ref || f.days) && daysOk

  const build = (): Sermon => {
    const questions = f.questions.split('\n').map((q) => q.trim()).filter(Boolean)
    const days: DayPlan[] | undefined = customized
      ? dayRefs.map((r, i) => ({ weekday: (i + 1) as Weekday, ref: r!, focus: (dayTexts[i] === f.days?.[i] && f.focus?.[i]) || WEEKDAYS[i].focus }))
      : undefined
    return {
      id: f.id ?? f.date, date: f.date, title: f.title.trim(), passage: f.passage.trim(), preacher: f.preacher.trim(),
      ...(days ? { days } : {}),
      ...(questions.length ? { groupQuestions: questions } : {}),
      ...(f.family.trim() ? { familyQuestion: f.family.trim() } : {}),
    }
  }

  const saveDraft = async () => {
    const s = build()
    const list = [...drafts.filter((d) => d.id !== s.id), s].sort(byDate)
    await db.cache.put({ id: 'draft', sermons: list, fetchedAt: Date.now() })
    setMsg('이 기기에 저장했어요. 오늘 화면에서 미리 볼 수 있어요. 성도들에게 보이려면 아래에서 파일을 내려받아 올려 주세요.')
    setF(blank())
  }

  const removeDraft = async (id: string) => {
    await db.cache.put({ id: 'draft', sermons: drafts.filter((d) => d.id !== id), fetchedAt: Date.now() })
  }

  const download = () => {
    const merged = new Map(feed.map((s) => [s.id, s]))
    for (const s of drafts) merged.set(s.id, s)
    const list = [...merged.values()].sort(byDate)
    const blob = new Blob([JSON.stringify(list, null, 2) + '\n'], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'sermons.json'; a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="min-h-dvh">
      <TopBar title="📝 설교 등록 (담당자)" back="/more" />
      <main className="page">
        <section className="card space-y-3">
          <h2 className="font-semibold">{f.id ? '✏️ 설교 고치기' : '📖 새 주일 설교'}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="dt">주일 날짜</label>
              <input id="dt" type="date" className="field" value={f.date} onChange={(e) => set({ date: e.target.value })} />
              {f.date && parseDate(f.date).getDay() !== 0 && <p className="mt-1 text-xs text-dawn-700">주일(일요일) 날짜를 골라 주세요.</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="pr">설교자</label>
              <input id="pr" className="field" value={f.preacher} onChange={(e) => set({ preacher: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="tt">설교 제목</label>
            <input id="tt" className="field" value={f.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="ps">본문 범위</label>
            <input id="ps" className="field" placeholder="예: 요한복음 15:1-17 / 시편 23 / 요 15:1-16:4" value={f.passage}
              onChange={(e) => set({ passage: e.target.value, days: null })} />
            {f.passage && !ref && !f.days && <p className="mt-1 text-xs text-dawn-700">본문 범위를 읽지 못했어요. ‘책이름 장:절-절’ 형식으로 적어 주세요.</p>}
            {ref && <p className="mt-1 text-xs text-moss-700">✓ {formatRef(ref)} · {expandRef(ref).length}절</p>}
          </div>

          {(auto || f.days) && (
            <div className="rounded-2xl bg-moss-50 p-3">
              <div className="mb-2 flex items-center">
                <p className="flex-1 text-sm font-semibold">요일별 묵상 본문 {customized ? '(직접 고침)' : '(월~금 자동으로 나눔)'}</p>
                {f.days && auto && <button className="text-xs text-moss-700 underline" onClick={() => set({ days: null })}>자동으로 되돌리기</button>}
              </div>
              {WEEKDAYS.slice(0, dayTexts.length).map((d, i) => (
                <div key={d.key} className="mb-1.5 flex items-center gap-2">
                  <span className="w-14 text-sm text-ink-500">{d.short} {fmtDate(addDays(parseDate(f.date || nextSunday()), d.key)).replace('월 ', '/').replace('일', '')}</span>
                  <input aria-label={`${d.label} 본문`} className={`field !py-2 text-sm ${dayRefs[i] ? '' : '!border-dawn-500'}`}
                    value={dayTexts[i] ?? ''} onChange={(e) => { const next = [...dayTexts]; next[i] = e.target.value; set({ days: next }) }} />
                </div>
              ))}
              <div className="mt-1 flex gap-3 text-xs">
                {dayTexts.length < 7 && <button className="text-moss-700 underline" onClick={() => set({ days: [...dayTexts, ''] })}>+ {WEEKDAYS[dayTexts.length].label} 추가</button>}
                {dayTexts.length > 1 && <button className="text-ink-500 underline" onClick={() => set({ days: dayTexts.slice(0, -1) })}>− 마지막 날 빼기</button>}
              </div>
              {!daysOk && <p className="mt-1 text-xs text-dawn-700">요일 본문을 ‘책이름 장:절-절’ 형식으로 적어 주세요. (책은 달라도 돼요)</p>}
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="gq">목장 나눔 질문 <span className="font-normal text-ink-500">(한 줄에 하나, 선택)</span></label>
            <textarea id="gq" className="field" rows={3} value={f.questions} onChange={(e) => set({ questions: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="fq">가정예배 질문 <span className="font-normal text-ink-500">(선택)</span></label>
            <input id="fq" className="field" value={f.family} onChange={(e) => set({ family: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={!valid} onClick={saveDraft}>이 기기에 저장 · 미리 보기</button>
            {f.id && <button className="btn-ghost" onClick={() => setF(blank())}>취소</button>}
          </div>
          {msg && <p className="text-sm text-moss-700" role="status">{msg}</p>}
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">📋 설교 목록 ({sermons.length})</h2>
          <ul className="divide-y divide-moss-100">
            {[...sermons].reverse().map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-16 text-ink-500">{fmtDate(parseDate(s.date))}</span>
                <span className="flex-1 truncate">{s.title} <span className="text-ink-500">· {s.passage}</span></span>
                {s.draft && <span className="rounded-full bg-dawn-100 px-2 py-0.5 text-[11px] text-dawn-700">이 기기만</span>}
                <button className="text-moss-700 underline" onClick={() => { setF(fromSermon(s)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>고치기</button>
                {s.draft && <button className="text-ink-500 underline" onClick={() => removeDraft(s.id)}>빼기</button>}
              </li>
            ))}
          </ul>
          <button className="btn-primary w-full" onClick={download} disabled={!drafts.length}>⬇ sermons.json 내려받기</button>
          <div className="rounded-2xl bg-moss-50 p-3 text-xs leading-relaxed text-ink-700">
            <b>성도들에게 반영하는 법</b>
            <ol className="mt-1 list-decimal pl-4">
              <li>위 버튼으로 <code>sermons.json</code>을 내려받아요. (지금 목록 + 이 기기에서 저장한 설교가 합쳐져 있어요)</li>
              <li>앱 저장소의 <code>public/sermons.json</code>을 이 파일로 바꿔 올려요.</li>
              <li>1~2분 뒤 성도들의 앱을 새로 열면 반영돼요. 반영된 뒤에는 ‘이 기기만’ 설교를 빼도 돼요.</li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  )
}
