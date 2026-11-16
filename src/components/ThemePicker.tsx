import { THEMES, type ThemeKey } from '../lib/theme'

/** 앱 색상 고르기: 동그란 색 견본 5개 (주황 · 하늘 · 보라 · 분홍 · 초록) */
export default function ThemePicker({ value, onChange }: { value: ThemeKey; onChange: (k: ThemeKey) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="앱 색상">
      {THEMES.map((t) => {
        const on = t.key === value
        return (
          <button key={t.key} type="button" role="radio" aria-checked={on} onClick={() => onChange(t.key)}
            className="flex flex-col items-center gap-1 text-xs font-semibold text-ink-700">
            <span className={`grid h-11 max-h-[13vw] w-11 max-w-[13vw] place-items-center rounded-full shadow-sm transition ${on ? 'ring-2 ring-offset-2' : ''}`}
              style={{ background: `linear-gradient(135deg, ${t.ui[400]}, ${t.ui[600]})`, ['--tw-ring-color' as string]: t.ui[600] }}>
              {on && <span className="text-base text-white" aria-hidden>✓</span>}
            </span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
