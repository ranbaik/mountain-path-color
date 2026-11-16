import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
import { useConfig } from '../config'
import type { Profile } from '../db'
import { resizePhoto } from '../lib/avatar'
import { exportBackup, importBackup } from '../lib/backup'
import { BIBLE_CREDIT } from '../lib/bible'
import { FontSizePicker } from '../components/DisplaySheet'
import ThemePicker from '../components/ThemePicker'
import { saveProfile, useProfile } from '../lib/profile'
import { DEFAULT_THEME } from '../lib/theme'

export default function More() {
  const cfg = useConfig()
  const p = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  if (p === undefined) return null
  const prof: Profile = p ?? { id: 'me', name: '', seniorMode: false, fontScale: 1 }

  const restore = async (f?: File) => {
    if (!f) return
    try { const n = await importBackup(f); setMsg(`묵상 ${n}개를 복원했어요.`) }
    catch (e) { setMsg((e as Error).message) }
  }

  return (
    <div className="min-h-dvh">
      <TopBar title="⚙️ 더보기" />
      <main className="page">
        <section className="card space-y-4">
          <h2 className="font-semibold">🎨 보기 설정</h2>
          <div>
            <p className="field-label">🌈 앱 색상</p>
            <ThemePicker value={prof.theme ?? DEFAULT_THEME} onChange={(k) => saveProfile({ theme: k })} />
            <p className="mt-2 text-xs text-ink-500">‘나의 길’ 산의 색과 나무도 함께 바뀌어요.</p>
          </div>
          <div>
            <label className="field-label" htmlFor="nm">🙂 이름</label>
            <input id="nm" className="field" value={prof.name} onChange={(e) => saveProfile({ name: e.target.value })} />
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-6 w-6 accent-moss-600" checked={prof.seniorMode} onChange={(e) => saveProfile({ seniorMode: e.target.checked })} />
            <span><b>👵 크게 보기 (시니어 모드)</b><br /><span className="text-sm text-ink-500">‘마음에 남은 말씀’과 ‘기도 한 줄’ 두 칸만, 큰 글씨로</span></span>
          </label>
          <div>
            <p className="field-label">🔠 글자 크기</p>
            <FontSizePicker value={prof.fontScale} onChange={(v) => saveProfile({ fontScale: v })} />
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">🧑 나의 길 아바타</h2>
          <div className="flex gap-2">
            {(['female', 'male'] as const).map((g) => (
              <button key={g} onClick={() => saveProfile({ avatarGender: g })}
                className={`chip ${(prof.avatarGender ?? 'female') === g ? 'border-moss-500 bg-moss-100 text-moss-700' : 'border-moss-200 text-ink-500'}`}>
                {g === 'female' ? '👩 여성' : '👨 남성'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {prof.avatarPhoto && <img src={prof.avatarPhoto} alt="내 아바타 사진" className="h-12 w-12 rounded-full object-cover" />}
            <button className="btn-ghost" onClick={() => photoRef.current?.click()}>📷 내 사진으로</button>
            {prof.avatarPhoto && <button className="text-sm text-ink-500 underline" onClick={() => saveProfile({ avatarPhoto: undefined })}>기본 그림으로</button>}
            <input ref={photoRef} type="file" accept="image/*" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) saveProfile({ avatarPhoto: await resizePhoto(f) }); e.target.value = '' }} />
          </div>
          <p className="text-xs text-ink-500">사진은 이 기기에만 저장돼요.</p>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">💾 백업과 복원</h2>
          <p className="text-sm leading-relaxed text-ink-700">묵상 기록은 이 기기 브라우저 안에만 있어요. 기기를 바꾸거나 브라우저 기록을 지우기 전에 백업 파일을 받아 두세요.</p>
          <p className="rounded-xl bg-dawn-100 px-3 py-2 text-xs leading-relaxed text-dawn-700">
            🔒 백업 파일에는 <b>기도 내용도 들어 있어요.</b> 내 기기에 보관만 하고 다른 사람에게 보내지 마세요.
          </p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1 !py-2.5" onClick={() => exportBackup()}>⬇ 백업 저장</button>
            <button className="btn-ghost flex-1" onClick={() => fileRef.current?.click()}>⬆ 복원</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {msg && <p className="text-sm text-moss-700" role="status">{msg}</p>}
        </section>

        <Link to="/more/admin" className="card flex items-center gap-3">
          <span className="text-2xl" aria-hidden>📝</span>
          <span className="flex-1"><b>설교 등록 (담당자)</b><br /><span className="text-sm text-ink-500">주일 설교를 넣고 월~금 본문을 나눠요</span></span>
          <span className="text-ink-300">›</span>
        </Link>

        <section className="card space-y-1 text-sm text-ink-500">
          <h2 className="mb-1 font-semibold text-ink-900">ℹ️ 앱 정보</h2>
          {cfg.logoUrl && <img src={cfg.logoUrl} alt="" className="mb-2 h-10 w-10 object-contain" />}
          <p>{cfg.appName}{cfg.churchName ? ` · ${cfg.churchName}` : ''}</p>
          <p>성경 본문: {BIBLE_CREDIT}</p>
          {cfg.contactNote && <p>{cfg.contactNote}</p>}
        </section>
      </main>
      <BottomNav />
    </div>
  )
}
