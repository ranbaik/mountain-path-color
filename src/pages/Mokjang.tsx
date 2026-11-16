import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
import { useConfig } from '../config'
import { db } from '../db'
import { FIELD_LABEL, buildGroupShareText, type ShareableField } from '../lib/privacy'
import { saveProfile, useProfile } from '../lib/profile'
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
  // 카카오톡: 휴대폰은 공유 창에서 ‘카카오톡’을 고르면 글 전체가 그대로 감. 공유 창이 없으면(PC) 복사 후 붙여넣기
  const canShare = typeof navigator.share === 'function'
  const kakao = async () => {
    if (canShare) return share()
    await copy()
  }
  const room = profile?.kakaoRoom ?? ''
  const [roomDraft, setRoomDraft] = useState<string | null>(null)
  const roomOk = (u: string) => /^https:\/\/open\.kakao\.com\/[\w/?=&-]+$/.test(u.trim())
  const copyAndOpenRoom = async () => {
    try { await navigator.clipboard.writeText(text); flash('복사했어요. 열린 목장방 입력창을 길게 눌러 붙여 넣으세요.') } catch { flash('복사하지 못했어요. 글을 길게 눌러 복사해 주세요.') }
    window.open(room, '_blank', 'noopener')
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
              <button onClick={kakao}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] px-6 py-3 font-semibold text-[#191919] shadow-card transition active:scale-[0.98]">
                <span aria-hidden>💬</span> 카카오톡으로 나누기
              </button>
              <p className="-mt-1 text-center text-xs text-ink-500">
                {canShare ? '공유 창이 뜨면 ‘카카오톡’ → 목장 단톡방을 고르세요.' : '글이 복사돼요. PC 카카오톡 목장방에 붙여 넣으세요.'}
              </p>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={copy}>📋 복사하기</button>
                {room && roomOk(room) && <button className="btn-ghost flex-1" onClick={copyAndOpenRoom}>🚪 복사하고 목장방 열기</button>}
              </div>
              {msg && <p className="text-center text-sm text-moss-700" role="status">{msg}</p>}
            </section>

            <details className="card">
              <summary className="cursor-pointer font-semibold">🔗 우리 목장 오픈채팅방 연결하기 (선택)</summary>
              <div className="mt-3 space-y-2">
                <p className="text-sm leading-relaxed text-ink-500">
                  목장방이 카카오톡 <b>오픈채팅</b>이면 방의 링크(https://open.kakao.com/…)를 넣어 두세요.
                  ‘복사하고 목장방 열기’를 누르면 나눔 글이 복사되고 그 방이 바로 열려요. 주소는 이 기기에만 저장돼요.
                </p>
                <input className="field" inputMode="url" placeholder="https://open.kakao.com/o/…" aria-label="오픈채팅 주소"
                  value={roomDraft ?? room} onChange={(e) => setRoomDraft(e.target.value)} />
                {roomDraft !== null && roomDraft.trim() !== '' && !roomOk(roomDraft) && (
                  <p className="text-xs text-dawn-700">https://open.kakao.com/ 으로 시작하는 주소만 넣을 수 있어요.</p>
                )}
                <div className="flex gap-2">
                  <button className="btn-primary flex-1 !py-2.5" disabled={roomDraft === null || (roomDraft.trim() !== '' && !roomOk(roomDraft))}
                    onClick={async () => { await saveProfile({ kakaoRoom: roomDraft!.trim() }); setRoomDraft(null); flash(roomDraft!.trim() ? '목장방 주소를 저장했어요.' : '목장방 주소를 지웠어요.') }}>저장</button>
                  {room && <button className="btn-ghost" onClick={async () => { await saveProfile({ kakaoRoom: '' }); setRoomDraft(null) }}>지우기</button>}
                </div>
              </div>
            </details>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
