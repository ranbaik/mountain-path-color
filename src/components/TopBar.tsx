import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BgmToggle } from './BgmPanel'

export default function TopBar({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="no-print safe-top sticky top-0 z-20 bg-moss-50/85 px-4 pb-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-2">
        {back && (
          <button aria-label="뒤로" onClick={() => nav(back)} className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-xl text-ink-700 hover:bg-moss-100">‹</button>
        )}
        <h1 className="flex-1 truncate font-serif text-lg font-bold">{title}</h1>
        {right}
        <BgmToggle />
      </div>
    </header>
  )
}
