import { useEffect } from 'react'
import type { Profile } from '../db'
import { saveProfile, useProfile } from '../lib/profile'
import { DEFAULT_FONT, FONTS, type FontKey } from '../lib/font'
import { DEFAULT_THEME } from '../lib/theme'
import BgmPanel from './BgmPanel'
import ThemePicker from './ThemePicker'

/** 글자 크기 4단계 (시니어용 ‘아주 크게’ 포함) */
export const FONT_SIZES: { v: Profile['fontScale']; label: string }[] = [
  { v: 1, label: '보통' },
  { v: 1.15, label: '크게' },
  { v: 1.3, label: '더 크게' },
  { v: 1.5, label: '아주 크게' },
]

export function FontSizePicker({ value, onChange }: { value: Profile['fontScale']; onChange: (v: Profile['fontScale']) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="글자 크기">
      {FONT_SIZES.map((s, i) => {
        const on = value === s.v
        return (
          <button key={s.v} type="button" role="radio" aria-checked={on} onClick={() => onChange(s.v)}
            className={`flex flex-col items-center justify-end rounded-2xl border px-1 pb-1.5 pt-2 ${on ? 'border-moss-500 bg-moss-100 text-moss-700' : 'border-moss-200 bg-white text-ink-700'}`}>
            <span className="leading-none" style={{ fontSize: `${18 + i * 5}px` }} aria-hidden>가</span>
            <span className="mt-1 text-[11px] leading-tight">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 글꼴 고르기: 각 단추를 그 글꼴로 보여 줌 */
export function FontPicker({ value, onChange }: { value: FontKey; onChange: (k: FontKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="글꼴">
      {FONTS.map((f) => {
        const on = value === f.key
        return (
          <button key={f.key} type="button" role="radio" aria-checked={on} onClick={() => onChange(f.key)}
            style={{ fontFamily: `${f.family}, Pretendard, sans-serif` }}
            className={`flex flex-col items-center rounded-2xl border px-1 py-2 ${on ? 'border-moss-500 bg-moss-100 text-moss-700' : 'border-moss-200 bg-white text-ink-700'}`}>
            <span className="text-[19px] leading-tight">{on ? '✓ ' : ''}{f.label}</span>
            <span className="mt-0.5 text-[11px] leading-tight text-ink-500">{f.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 하단 메뉴 ‘🎨 꾸미기’를 누르면 아래에서 올라오는 창: 앱 색상 · 글꼴 · 글자 크기 · 크게 보기 · 배경음악 */
export default function DisplaySheet({ onClose }: { onClose: () => void }) {
  const p = useProfile()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (p === undefined) return null
  const theme = p?.theme ?? DEFAULT_THEME
  const font = p?.fontScale ?? 1

  return (
    <div className="no-print fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="화면 꾸미기">
      <button className="absolute inset-0 bg-black/30" aria-label="닫기" onClick={onClose} />
      <div className="safe-bottom rise relative max-h-[88dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-t-3xl bg-white px-5 pt-4 shadow-card">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-moss-200" aria-hidden />
        <div className="flex items-center">
          <h2 className="min-w-0 flex-1 whitespace-nowrap text-lg font-bold">🎨 화면 꾸미기</h2>
          <button className="btn-ghost shrink-0 !px-3 !py-1.5" onClick={onClose}>✔️ 닫기</button>
        </div>
        <div>
          <p className="field-label">🌈 앱 색상</p>
          <ThemePicker value={theme} onChange={(k) => saveProfile({ theme: k })} />
        </div>
        <div>
          <p className="field-label">✏️ 글꼴</p>
          <FontPicker value={p?.font ?? DEFAULT_FONT} onChange={(k) => saveProfile({ font: k })} />
        </div>
        <div>
          <p className="field-label">🔠 글자 크기</p>
          <FontSizePicker value={font} onChange={(v) => saveProfile({ fontScale: v })} />
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3">
          <input type="checkbox" className="h-6 w-6 accent-moss-600" checked={!!p?.seniorMode} onChange={(e) => saveProfile({ seniorMode: e.target.checked })} />
          <span><b>👵 크게 보기 (시니어 모드)</b><br /><span className="text-sm text-ink-500">묵상 칸을 두 개로 줄이고 글씨를 한 번 더 키워요</span></span>
        </label>
        <BgmPanel />
        <p className="pb-2 text-center text-xs text-ink-500">바꾼 내용은 바로 적용되고, 이 기기에 저장돼요.</p>
      </div>
    </div>
  )
}
