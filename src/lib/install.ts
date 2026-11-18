import { useEffect, useState } from 'react'

/** 안드로이드 Chrome·삼성 인터넷이 주는 ‘앱 설치’ 이벤트 (표준 타입에 없어서 직접 정의) */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const subs = new Set<() => void>()

/** 앱이 그려지기 전에 이벤트를 놓치지 않도록 main.tsx 에서 가장 먼저 부름 */
export function listenInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    subs.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export type Platform = 'ios' | 'kakao' | 'android' | 'desktop'
export function platform(): Platform {
  const ua = navigator.userAgent
  if (/KAKAOTALK/i.test(ua)) return 'kakao'
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => {
    const f = () => tick((n) => n + 1)
    subs.add(f)
    return () => { subs.delete(f) }
  }, [])
  return {
    canPrompt: !!deferred,
    async install() {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      subs.forEach((f) => f())
      return outcome === 'accepted'
    },
  }
}

/** 배포된 사이트에서만 서비스 워커 등록 (인터넷 없이도 열리게) */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* 못 해도 앱은 그대로 동작 */ }) })
}
