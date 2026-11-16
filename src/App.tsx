import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useConfig } from './config'
import { initBgm } from './lib/bgm'
import { useApplyDisplay, useProfile } from './lib/profile'
import Admin from './pages/Admin'
import FamilyWorship from './pages/FamilyWorship'
import Mokjang from './pages/Mokjang'
import More from './pages/More'
import Today from './pages/Today'

// 3D 화면은 three.js가 커서 필요할 때만 불러옴
const MyPath3D = lazy(() => import('./pages/MyPath3D'))

// HashRouter: 서버 설정 없이 어느 정적 호스팅에서도 새로고침이 안전함
export default function App() {
  useConfig() // 문서 제목 반영
  useApplyDisplay(useProfile())
  useEffect(() => { initBgm() }, [])
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/day/:sermonId/:weekday" element={<Today />} />
        <Route path="/path" element={<Suspense fallback={<div className="grid h-dvh place-items-center text-ink-500">산길을 닦는 중…</div>}><MyPath3D /></Suspense>} />
        <Route path="/mokjang" element={<Mokjang />} />
        <Route path="/family" element={<FamilyWorship />} />
        <Route path="/more" element={<More />} />
        <Route path="/more/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
