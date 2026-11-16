import Dexie, { type EntityTable } from 'dexie'

/** 성경 구절 위치 (book: 1~66) */
export interface VersePos { c: number; v: number }
export interface Ref { book: number; from: VersePos; to: VersePos }

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7   // 월~금 (+ 토=6, 주일=7: 매일 묵상 계획일 때)

export interface DayPlan { weekday: Weekday; ref: Ref; focus?: string }

/** 담당자가 public/sermons.json 으로 배포하는 주일 설교 */
export interface Sermon {
  id: string
  date: string            // 주일 날짜 YYYY-MM-DD
  title: string
  passage: string         // 사람이 읽는 본문 범위 (예: "요한복음 15:1-17")
  preacher: string
  days?: DayPlan[]        // 요일별 본문(1~7일, 책이 달라도 됨). 없으면 passage 를 월~금 자동 분할
  groupQuestions?: string[]
  familyQuestion?: string
}

/**
 * 묵상 카드 한 장 (설교 1편 × 요일 1개).
 * ⚠️ prayer(기도)는 항상 비공개 — 공유·목장·인쇄는 반드시 lib/privacy.ts 의 toShareable 을 거칠 것.
 */
export interface Meditation {
  id: string              // `${sermonId}:${weekday}`
  sermonId: string
  weekday: Weekday
  observe: string         // 관찰
  interpret: string       // 해석
  apply: string           // 적용
  remembered: string      // (시니어) 마음에 남은 말씀
  prayer: string          // 기도 — 비공개
  done: boolean
  updatedAt: number
}

export interface Profile {
  id: 'me'
  name: string
  seniorMode: boolean
  fontScale: 1 | 1.15 | 1.3 | 1.5
  avatarGender?: 'female' | 'male'
  avatarPhoto?: string    // 정사각형 JPEG dataURL, 기기에만 저장
  theme?: 'orange' | 'sky' | 'purple' | 'pink' | 'green'  // 앱 색상 (lib/theme.ts)
}

/** 'feed' = 마지막으로 받은 sermons.json, 'draft' = 담당자가 이 기기에서만 미리 보는 설교 */
export interface SermonCache { id: 'feed' | 'draft'; sermons: Sermon[]; fetchedAt: number }

export const db = new Dexie('mountain-path-color') as Dexie & {
  profile: EntityTable<Profile, 'id'>
  meditations: EntityTable<Meditation, 'id'>
  cache: EntityTable<SermonCache, 'id'>
}

db.version(1).stores({
  profile: 'id',
  meditations: 'id, sermonId, updatedAt',
  cache: 'id',
})

export const medId = (sermonId: string, weekday: Weekday) => `${sermonId}:${weekday}`

export function emptyMeditation(sermonId: string, weekday: Weekday): Meditation {
  return {
    id: medId(sermonId, weekday), sermonId, weekday,
    observe: '', interpret: '', apply: '', remembered: '', prayer: '',
    done: false, updatedAt: Date.now(),
  }
}

/** 한 칸이라도 썼거나 완료를 누른 날 = 묵상한 날 */
export const hasContent = (m?: Meditation) =>
  !!m && (m.done || [m.observe, m.interpret, m.apply, m.remembered, m.prayer].some((t) => t.trim()))
