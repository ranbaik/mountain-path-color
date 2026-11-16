import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DisplaySheet from './DisplaySheet'

const items = [
  { to: '/', label: '오늘', icon: '☀️', active: (p: string) => p === '/' || p.startsWith('/day/') },
  { to: '/path', label: '나의 길', icon: '⛰️', active: (p: string) => p === '/path' },
  { to: '/mokjang', label: '목장', icon: '🌿', active: (p: string) => p === '/mokjang' },
  { to: '/family', label: '가정예배', icon: '🏡', active: (p: string) => p === '/family' },
  { to: '/more', label: '더보기', icon: '⋯', active: (p: string) => p.startsWith('/more') },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const [sheet, setSheet] = useState(false)
  const cls = 'flex min-w-0 flex-1 flex-col items-center gap-0.5 whitespace-nowrap pt-2 text-[12.5px] font-semibold'  // 글자 크기를 키워도 6칸이 한 줄에 들어가도록 고정 크기
  return (
    <>
      <nav aria-label="주요 메뉴" className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-moss-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {items.map((it) => {
            const on = it.active(pathname)
            return (
              <Link key={it.to} to={it.to} aria-current={on ? 'page' : undefined} className={`${cls} ${on ? 'text-moss-700' : 'text-ink-500'}`}>
                <span className="text-[22px] leading-none" aria-hidden>{it.icon}</span>{it.label}
              </Link>
            )
          })}
          {/* 어느 화면에서나 바로 색상·글자 크기를 바꿀 수 있게 */}
          <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}
            className={`${cls} ${sheet ? 'text-moss-700' : 'text-ink-500'}`}>
            <span className="text-[22px] leading-none" aria-hidden>🎨</span>꾸미기
          </button>
        </div>
      </nav>
      {sheet && <DisplaySheet onClose={() => setSheet(false)} />}
    </>
  )
}
