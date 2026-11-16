import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import MeditationCard from '../components/MeditationCard'
import Passage from '../components/Passage'
import ThemePicker from '../components/ThemePicker'
import { useConfig } from '../config'
import { db, hasContent, type DayPlan, type Sermon, type Weekday } from '../db'
import { formatRef } from '../lib/bible'
import { saveProfile, useProfile } from '../lib/profile'
import { DEFAULT_THEME, applyTheme, type ThemeKey } from '../lib/theme'
import { useSermons } from '../lib/sermons'
import { WEEKDAYS, currentWeek, dayDate, dayPlans, fmtDate, parseDate } from '../lib/split'

function Welcome() {
  const cfg = useConfig()
  const [name, setName] = useState('')
  const [senior, setSenior] = useState(false)
  const [theme, setTheme] = useState<ThemeKey>(() => (document.documentElement.dataset.theme as ThemeKey) || DEFAULT_THEME)
  return (
    <div className="page safe-top rise">
      <div className="pt-8 text-center">
        {cfg.logoUrl && <img src={cfg.logoUrl} alt="" className="mx-auto mb-3 h-14 w-14 object-contain" />}
        <p className="text-5xl" aria-hidden>✨📖🌏</p>
        <h1 className="mt-3 font-serif text-2xl font-bold">{cfg.appName}</h1>
        <p className="mt-1 text-ink-500">{cfg.tagline}</p>
        {cfg.churchName && <p className="mt-1 text-sm text-moss-700">{cfg.churchName}</p>}
      </div>
      <div className="card space-y-4">
        <div>
          <label className="field-label" htmlFor="nm">🙂 어떻게 불러 드릴까요?</label>
          <input id="nm" className="field" placeholder="이름 또는 별명" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <fieldset>
          <legend className="field-label">📝 묵상 카드 모양</legend>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: false, t: '기본', d: '관찰·해석·적용·기도' }, { v: true, t: '크게 보기', d: '남은 말씀·기도 한 줄 · 큰 글씨' }].map((o) => (
              <button key={o.t} type="button" onClick={() => setSenior(o.v)} aria-pressed={senior === o.v}
                className={`rounded-2xl border p-3 text-left ${senior === o.v ? 'border-moss-500 bg-moss-50' : 'border-moss-200'}`}>
                <b className="block">{o.t}</b><span className="text-xs text-ink-500">{o.d}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="field-label">🌈 앱 색상</p>
          <ThemePicker value={theme} onChange={(k) => { setTheme(k); applyTheme(k) }} />
        </div>
        <button className="btn-primary w-full" onClick={() => saveProfile({ name: name.trim(), seniorMode: senior, theme })}>🚶 말씀의 길 시작하기</button>
        <p className="text-center text-xs leading-relaxed text-ink-500">묵상 기록은 이 기기 안에만 저장돼요. 서버로 보내지 않아요.</p>
      </div>
    </div>
  )
}

/** 설교자가 있으면 '11월 15일 주일 말씀', 매일 묵상 계획이면 '11월 16일 ~ 11월 22일 묵상' */
function weekKicker(sermon: Sermon, plans: DayPlan[] | null) {
  if (sermon.preacher || !plans?.length) return `${fmtDate(parseDate(sermon.date))} 주일 말씀`
  return `${fmtDate(dayDate(sermon, plans[0].weekday))} ~ ${fmtDate(dayDate(sermon, plans.at(-1)!.weekday))} 묵상`
}

function WeekDays({ sermon, plans, weekday, today }: { sermon: Sermon; plans: DayPlan[]; weekday?: Weekday; today: Weekday | null }) {
  const meds = useLiveQuery(() => db.meditations.where('sermonId').equals(sermon.id).toArray(), [sermon.id], [])
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }} role="tablist" aria-label="요일 선택">
      {plans.map((p) => WEEKDAYS[p.weekday - 1]).map((d) => {
        const on = d.key === weekday
        const did = hasContent(meds.find((m) => m.weekday === d.key))
        return (
          <Link key={d.key} to={`/day/${sermon.id}/${d.key}`} role="tab" aria-selected={on}
            className={`rounded-2xl py-2 text-center text-sm font-semibold transition ${on ? 'bg-moss-600 text-white' : 'bg-white text-ink-700'} ${today === d.key && !on ? 'ring-2 ring-dawn-300' : ''}`}>
            {d.short}
            <span className={`mt-0.5 block text-[11px] font-normal ${on ? 'text-moss-100' : 'text-ink-500'}`}>{did ? '✓' : fmtDate(dayDate(sermon, d.key)).replace('월 ', '/').replace('일', '')}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function Today() {
  const params = useParams()
  const nav = useNavigate()
  const profile = useProfile()
  const { sermons, loading, offline } = useSermons()
  const cfg = useConfig()

  if (profile === undefined) return null
  if (profile === null) return <Welcome />

  const cw = currentWeek(sermons)
  const sermon = (params.sermonId && sermons.find((s) => s.id === params.sermonId)) || cw.sermon
  const pw = Number(params.weekday)
  const plans = sermon ? dayPlans(sermon) : null
  const weekday: Weekday | undefined = params.weekday && plans?.some((p) => p.weekday === pw) ? (pw as Weekday)
    : sermon === cw.sermon && cw.weekday ? cw.weekday : undefined
  const plan = plans?.find((p) => p.weekday === weekday)
  const todayWd = sermon === cw.sermon ? cw.weekday : null
  const hello = profile.name ? `${profile.name}님, ` : ''

  return (
    <div className="min-h-dvh">
      <header className="safe-top px-4 pb-2">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          {cfg.logoUrl && <img src={cfg.logoUrl} alt="" className="h-7 w-7 object-contain" />}
          <p className="min-w-0 flex-1 truncate font-serif text-lg font-bold">✨ {cfg.appName}</p>
          {sermons.length > 1 && sermon && (
            <select aria-label="다른 주 보기" className="min-w-0 max-w-[8.5rem] shrink-0 truncate rounded-full border border-moss-200 bg-white px-3 py-1.5 text-xs text-ink-700"
              value={sermon.id} onChange={(e) => nav(`/day/${e.target.value}/1`)}>
              {[...sermons].reverse().map((s) => <option key={s.id} value={s.id}>📅 {fmtDate(parseDate(s.date))} 주</option>)}
            </select>
          )}
        </div>
      </header>

      <main className="page">
        {offline && <p className="rounded-2xl bg-dawn-100 px-4 py-2 text-xs text-dawn-700">인터넷에 연결되지 않아 마지막으로 받은 설교를 보여 드려요.</p>}
        {loading && !sermon && <p className="card animate-pulse text-ink-500">이번 주 말씀을 받는 중…</p>}
        {!loading && !sermon && (
          <div className="card text-center text-ink-700">
            <p className="text-3xl">🌱</p>
            <p className="mt-2 font-semibold">아직 등록된 설교가 없어요.</p>
            <p className="mt-1 text-sm text-ink-500">담당자가 주일 설교를 올리면 여기에 월~금 묵상 본문이 나타나요.</p>
          </div>
        )}

        {sermon && (
          <>
            <section className="rise rounded-3xl bg-gradient-to-br from-moss-600 to-moss-800 p-5 text-white shadow-card">
              <p className="text-xs text-moss-100">{weekKicker(sermon, plans)}{'draft' in sermon && sermon.draft ? ' · 미리보기(이 기기만)' : ''}</p>
              <h1 className="mt-1 font-serif text-2xl font-bold leading-snug">{sermon.title}</h1>
              <p className="mt-1 text-sm text-moss-100">{sermon.passage}{sermon.preacher ? ` · ${sermon.preacher}` : ''}</p>
            </section>

            {plans && <WeekDays sermon={sermon} plans={plans} weekday={weekday} today={todayWd} />}

            {!plans && <p className="card text-sm text-dawn-700">본문 범위 “{sermon.passage}”를 읽지 못했어요. 담당자에게 알려 주세요.</p>}

            {plans && !plan && (
              <div className="card space-y-3 text-center">
                <p className="text-3xl" aria-hidden>{cw.inWeek && new Date().getDay() === 6 ? '🌄' : '⛪'}</p>
                <p className="font-serif text-lg font-bold">
                  {cw.inWeek && new Date().getDay() === 6 ? `${hello}한 주의 산길을 돌아보는 날이에요` : `${hello}이번 주 묵상은 ${WEEKDAYS[plans[0].weekday - 1].label}부터 시작해요`}
                </p>
                <p className="text-sm text-ink-500">{WEEKDAYS[plans[0].weekday - 1].label} 본문은 <b>{formatRef(plans[0].ref)}</b> 이에요. 위에서 요일을 눌러 미리 읽을 수 있어요.</p>
                <div className="flex justify-center gap-2">
                  <Link className="btn-ghost" to="/path">⛰️ 나의 길 보기</Link>
                  <Link className="btn-ghost" to="/mokjang">🌿 목장 나눔</Link>
                </div>
              </div>
            )}

            {plan && weekday && (
              <>
                <section className="card">
                  <p className="text-xs font-semibold text-moss-600">{WEEKDAYS[weekday - 1].label} · {fmtDate(dayDate(sermon, weekday))}</p>
                  <h2 className="mt-0.5 font-serif text-xl font-bold">📖 {formatRef(plan.ref)}</h2>
                  {plan.focus && <p className="mt-1 text-sm text-ink-500">{plan.focus}</p>}
                  <div className="mt-3"><Passage refRange={plan.ref} /></div>
                </section>
                <MeditationCard sermonId={sermon.id} weekday={weekday} senior={profile.seniorMode} />
              </>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
