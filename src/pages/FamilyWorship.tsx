import { useState } from 'react'
import BottomNav from '../components/BottomNav'
import Passage from '../components/Passage'
import TopBar from '../components/TopBar'
import { useConfig } from '../config'
import { formatRef } from '../lib/bible'
import { useSermons } from '../lib/sermons'
import { WEEKDAYS, currentWeek, dayPlans, fmtDate, parseDate } from '../lib/split'

/**
 * 가정예배 순서지. 이번 주 본문만 사용하고, 개인 묵상 기록(특히 기도)은 전혀 읽지 않음.
 * 인쇄해도 개인 정보가 나가지 않음.
 */
export default function FamilyWorship() {
  const cfg = useConfig()
  const { sermons } = useSermons()
  const cw = currentWeek(sermons)
  const sermon = cw.sermon
  const plans = sermon ? dayPlans(sermon) : null
  const [day, setDay] = useState<number | null>(null)
  const want = day ?? cw.weekday ?? plans?.[0]?.weekday
  const plan = plans?.find((p) => p.weekday === want) ?? plans?.[0]

  const steps = sermon && plan ? [
    { t: '🕯️ 마음 열기', b: '가족이 둘러앉아 잠시 조용히 눈을 감고, 이 시간을 하나님께 드려요.' },
    { t: '🎵 함께 찬양', b: '가족이 좋아하는 찬양을 한 곡 함께 불러요.' },
    { t: '📖 말씀 읽기', b: `${formatRef(plan.ref)} — 한 절씩 돌아가며 소리 내어 읽어요.`, passage: true },
    { t: '💬 이야기 나누기', b: sermon.familyQuestion || '오늘 말씀에서 가장 기억에 남는 단어는 무엇인가요? 그 말씀대로 이번 주에 해 볼 일을 하나씩 말해 봐요.' },
    { t: '🙏 함께 기도', b: '나눈 이야기를 붙들고 한 사람씩 짧게 기도해요. (기도는 말로 드리고, 앱에는 적지 않아요)' },
    { t: '🤗 축복하며 마치기', b: '서로의 손을 잡고 “하나님이 너를 사랑하셔” 하고 축복해 주세요.' },
  ] : []

  return (
    <div className="min-h-dvh">
      <TopBar title="🏡 가정예배" right={sermon && <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => window.print()}>🖨 인쇄</button>} />
      <main className="page">
        {!sermon && <p className="card text-ink-500">아직 등록된 설교가 없어요.</p>}
        {sermon && plans && (
          <>
            <div className="print-only mb-4 text-center">
              <p className="text-sm">{cfg.appName}{cfg.churchName ? ` · ${cfg.churchName}` : ''}</p>
              <h1 className="font-serif text-2xl font-bold">가정예배 순서지</h1>
            </div>
            <section className="card">
              <p className="text-xs text-moss-600">{sermon.preacher ? `${fmtDate(parseDate(sermon.date))} 주일 말씀을 따라` : '이번 주 묵상 말씀을 따라'}</p>
              <h2 className="font-serif text-xl font-bold">{sermon.title}</h2>
              <p className="text-sm text-ink-500">{sermon.passage}</p>
              <div className="no-print mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}>
                {plans.map((p) => WEEKDAYS[p.weekday - 1]).map((d) => (
                  <button key={d.key} onClick={() => setDay(d.key)}
                    className={`rounded-xl py-1.5 text-sm font-semibold ${plan?.weekday === d.key ? 'bg-moss-600 text-white' : 'bg-moss-50 text-ink-700'}`}>{d.short}</button>
                ))}
              </div>
            </section>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.t} className="card">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-moss-100 text-sm text-moss-700">{i + 1}</span>{s.t}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{s.b}</p>
                  {s.passage && plan && <div className="mt-3"><Passage refRange={plan.ref} /></div>}
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
