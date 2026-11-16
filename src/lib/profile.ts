import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db, type Profile } from '../db'
import { applyTheme } from './theme'

export const DEFAULT_PROFILE: Profile = { id: 'me', name: '', seniorMode: false, fontScale: 1 }

/** undefined = 불러오는 중, null = 아직 처음 설정 전 */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null)
}

export async function saveProfile(patch: Partial<Profile>) {
  const cur = (await db.profile.get('me')) ?? DEFAULT_PROFILE
  await db.profile.put({ ...cur, ...patch, id: 'me' })
}

/** 시니어 모드·글자 크기를 문서 전체에 반영 (rem 기준이라 모든 화면이 같이 커짐) */
export function useApplyDisplay(p: Profile | null | undefined) {
  const senior = !!p?.seniorMode
  const scale = (p?.fontScale ?? 1) * (senior ? 1.12 : 1)
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * scale}px`
    document.body.classList.toggle('senior', senior)
  }, [scale, senior])
  // 프로필을 불러온 뒤에만 반영 (불러오는 중에는 main.tsx 가 넣은 마지막 테마 유지)
  const theme = p?.theme
  const loaded = p !== undefined
  useEffect(() => { if (loaded) applyTheme(theme) }, [loaded, theme])
}
