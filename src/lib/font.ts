/**
 * 글꼴 고르기. tailwind 의 font-sans / font-serif 가 CSS 변수 --app-font 를 읽으므로 변수만 바꾸면 전체가 바뀜.
 * 글꼴 파일은 index.html 의 Google Fonts(모두 SIL Open Font License) 에서, 실제로 쓰는 글자만 내려받음.
 */
export type FontKey = 'jua' | 'gowun' | 'nanumGothic' | 'nanumMyeongjo' | 'pretendard'

export interface FontOption {
  key: FontKey
  label: string
  hint: string
  family: string
  /** 굵기가 하나뿐인 글꼴은 가짜 굵게(번진 글씨)를 만들지 않음 */
  singleWeight: boolean
}

export const FONTS: FontOption[] = [
  { key: 'jua', label: '주아', hint: '동글동글', family: '"Jua"', singleWeight: true },
  { key: 'gowun', label: '고운돋움', hint: '부드럽게', family: '"Gowun Dodum"', singleWeight: true },
  { key: 'nanumGothic', label: '나눔고딕', hint: '또렷하게', family: '"Nanum Gothic"', singleWeight: false },
  { key: 'nanumMyeongjo', label: '나눔명조', hint: '성경책처럼', family: '"Nanum Myeongjo"', singleWeight: false },
  { key: 'pretendard', label: '기본', hint: '휴대폰 글씨', family: '"Pretendard"', singleWeight: false },
]

export const DEFAULT_FONT: FontKey = 'jua'
export const fontOf = (key?: string): FontOption => FONTS.find((f) => f.key === key) ?? FONTS[0]

const STORE = 'mountain-path-color:font'

export function applyFont(key?: string) {
  const f = fontOf(key)
  const root = document.documentElement
  root.style.setProperty('--app-font', f.family)
  root.style.setProperty('--app-synth', f.singleWeight ? 'none' : 'weight style')
  try { localStorage.setItem(STORE, f.key) } catch { /* 저장 못 해도 화면은 그대로 */ }
}

/** 첫 화면에서 글꼴이 바뀌며 깜빡이지 않도록, 마지막으로 고른 글꼴을 먼저 적용 */
export function applySavedFont() {
  let key: string | undefined
  try { key = localStorage.getItem(STORE) ?? undefined } catch { /* 없음 */ }
  applyFont(key)
}
