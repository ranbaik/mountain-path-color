import { useRef, useState } from 'react'
import { pauseBgm, playBgm, removeMyBgm, setBgmVolume, setMyBgm, useBgm } from '../lib/bgm'

/** 🎵 배경음악: 내 기기의 음악 파일 고르기 · 듣기/멈추기 · 음량 */
export default function BgmPanel() {
  const s = useBgm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const pick = () => fileRef.current?.click()

  return (
    <div>
      <p className="field-label">🎵 배경음악</p>
      {s.name ? (
        <div className="space-y-3 rounded-2xl bg-moss-50 p-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => (s.playing ? pauseBgm() : playBgm())}
              aria-label={s.playing ? '음악 멈추기' : '음악 듣기'}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-moss-600 text-xl text-white shadow-card">
              {s.playing ? '⏸' : '▶'}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.playing ? '🎶 ' : ''}{s.name}</p>
              <p className="text-xs text-ink-500">{s.source === 'mine' ? '내가 고른 음악 · 이 기기에만 저장' : '교회에서 준비한 음악'}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span aria-hidden>🔈</span>
            <input type="range" min={0} max={1} step={0.05} value={s.volume} aria-label="음량"
              onChange={(e) => setBgmVolume(Number(e.target.value))} className="min-w-0 flex-1 accent-moss-600" />
            <span aria-hidden>🔊</span>
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1 !px-3" onClick={pick}>🎼 다른 곡 고르기</button>
            {s.source === 'mine' && <button type="button" className="btn-ghost !px-3" onClick={() => removeMyBgm()}>🗑️ 지우기</button>}
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost w-full" onClick={pick}>🎼 내 휴대폰의 음악 파일 고르기</button>
      )}
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setErr('')
          try { await setMyBgm(f) } catch (x) { setErr(x instanceof Error ? x.message : '음악을 넣지 못했어요.') }
        }} />
      {err && <p className="mt-2 text-sm text-dawn-700" role="alert">{err}</p>}
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        고른 음악은 이 기기에만 저장되고, 백업이나 나눔 글에는 들어가지 않아요. 화면을 끄거나 다른 앱으로 가면 잠시 멈춰요.
      </p>
    </div>
  )
}

/** 화면 위쪽에 두는 작은 음악 단추 (음악이 있을 때만 보임) */
export function BgmToggle() {
  const s = useBgm()
  if (!s.name) return null
  return (
    <button type="button" onClick={() => (s.playing ? pauseBgm() : playBgm())}
      aria-label={s.playing ? '배경음악 멈추기' : '배경음악 듣기'} aria-pressed={s.playing}
      className={`no-print grid h-9 w-9 shrink-0 place-items-center rounded-full text-base ${s.playing ? 'bg-moss-600 text-white' : 'bg-white text-ink-500 ring-1 ring-moss-200'}`}>
      {s.playing ? '🎵' : '🔇'}
    </button>
  )
}
