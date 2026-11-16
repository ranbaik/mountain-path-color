import { useEffect, useState } from 'react'

/**
 * 교회마다 바꾸는 설정. 실제 값은 public/config.json 에서 읽으므로
 * 빌드 없이 그 파일만 고쳐 올리면 반영됨. (교회 이름·로고는 비워 두면 어디에도 표시되지 않음)
 */
export interface AppConfig {
  appName: string
  tagline: string
  churchName: string   // 비우면 표시 안 함
  logoUrl: string      // 비우면 표시 안 함 (예: "./logo.png")
  sermonsUrl: string   // 설교 목록 JSON 주소
  contactNote: string  // 더보기 > 앱 정보에 보일 안내(선택)
  bgmUrl: string       // (선택) 교회가 사용 허락을 받은 기본 배경음악 주소. 비우면 각자 고른 파일만
  bgmTitle: string     // 위 음악의 곡명·출처 표기
}

export const DEFAULT_CONFIG: AppConfig = {
  appName: '말씀의 빛, 세상으로',
  tagline: '말씀의 빛을 따라 한 걸음씩, 세상 속으로',
  churchName: '',
  logoUrl: '',
  sermonsUrl: './sermons.json',
  contactNote: '',
  bgmUrl: '',
  bgmTitle: '',
}

let cached: Promise<AppConfig> | null = null

export function loadConfig(): Promise<AppConfig> {
  cached ??= fetch('./config.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((c: Partial<AppConfig>) => ({ ...DEFAULT_CONFIG, ...c }))
  return cached
}

export function useConfig(): AppConfig {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG)
  useEffect(() => {
    let alive = true
    loadConfig().then((c) => {
      if (!alive) return
      setCfg(c)
      document.title = c.churchName ? `${c.appName} · ${c.churchName}` : c.appName
    })
    return () => { alive = false }
  }, [])
  return cfg
}
