/**
 * 앱 색상 테마 (주황 · 하늘 · 보라 · 분홍 · 초록).
 * - 화면 색: tailwind 의 `moss-50 … moss-800` 이 CSS 변수(--m-50 …)를 읽으므로, 변수만 바꾸면 모든 화면 색이 바뀜
 * - 흰 글씨가 올라가는 600·700·800 은 읽기 쉽도록(대비 4.5:1 이상) 진한 색으로 둠
 * - 3D 산(나의 길)도 테마마다 산자락 → 중턱 → 윗자락 3색 + 눈 덮인 정상, 나무 색이 달라짐
 */
export type ThemeKey = 'orange' | 'sky' | 'purple' | 'pink' | 'green'
type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800

export interface Theme {
  key: ThemeKey
  label: string
  ui: Record<Shade, string>
  /** 산 색: 산자락(아래) → 중턱 → 윗자락 (그 위는 눈) */
  mountain: [string, string, string]
  ground: string
  path: string
  /** 나무 잎 색 (여러 색을 섞어 심음) */
  trees: string[]
  /** 나무 모양: 뾰족한 침엽수 / 둥근 꽃나무 */
  treeShape: 'pine' | 'round'
  flowers: string[]
  /** 3D 배경 위·아래 */
  sky: [string, string]
}

export const THEMES: Theme[] = [
  {
    key: 'orange', label: '주황',
    ui: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#c2410c', 700: '#9a3412', 800: '#7c2d12' },
    mountain: ['#d9822b', '#f2a65a', '#f8d49b'], ground: '#fde7c8', path: '#fff4e2',
    trees: ['#e4572e', '#f29e4c', '#c0392b', '#f6c453'], treeShape: 'round', flowers: ['#ffd23f', '#ff8c42', '#ffffff'],
    sky: ['#fff1de', '#ffd9b0'],
  },
  {
    key: 'sky', label: '하늘',
    ui: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0369a1', 700: '#075985', 800: '#0c4a6e' },
    mountain: ['#5b8fb9', '#8fbfe0', '#c6e2f5'], ground: '#dff1fb', path: '#f7fbff',
    trees: ['#2f6f8f', '#3f8f9f', '#5aa9c9', '#1f5f7a'], treeShape: 'pine', flowers: ['#ffffff', '#9ad0f5', '#ffe680'],
    sky: ['#e8f6ff', '#bfe4fb'],
  },
  {
    key: 'purple', label: '보라',
    ui: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#7e22ce', 700: '#6b21a8', 800: '#581c87' },
    mountain: ['#7a5aa6', '#a687cf', '#d3c0ec'], ground: '#efe4fb', path: '#fbf7ff',
    trees: ['#8e5cc2', '#b28ddb', '#6d4a9e', '#c9a7eb'], treeShape: 'round', flowers: ['#e0c3fc', '#ffffff', '#f5b8e0'],
    sky: ['#f6efff', '#e1cdfa'],
  },
  {
    key: 'pink', label: '분홍',
    ui: { 50: '#fff0f7', 100: '#ffe0ef', 200: '#ffc2df', 300: '#ffa3cf', 400: '#ff86c1', 500: '#ff69b4', 600: '#d6287f', 700: '#ad1f67', 800: '#7f1a4c' },
    mountain: ['#e0679f', '#ff9fcb', '#ffd0e6'], ground: '#ffe3f0', path: '#fff4ea',
    trees: ['#ff8fc6', '#ffb7d9', '#f06aa8', '#ffd1e6'], treeShape: 'round', flowers: ['#ffffff', '#ff69b4', '#ffe36e'],
    sky: ['#fff2f8', '#ffd3e8'],
  },
  {
    key: 'green', label: '초록',
    ui: { 50: '#f3f7f1', 100: '#e3eedc', 200: '#c7dcbb', 300: '#a4c493', 400: '#7da66a', 500: '#5a8a4a', 600: '#44703a', 700: '#34562d', 800: '#26401f' },
    mountain: ['#5f8f4a', '#8fb874', '#c9dcb0'], ground: '#e3eedc', path: '#efe2c8',
    trees: ['#2f6b3a', '#3f8a4a', '#58a05a', '#2a5a33'], treeShape: 'pine', flowers: ['#ffffff', '#ffd23f', '#f28ab2'],
    sky: ['#f4f9ef', '#dcebd0'],
  },
]

export const DEFAULT_THEME: ThemeKey = 'pink'
export const themeOf = (key?: string): Theme => THEMES.find((t) => t.key === key) ?? THEMES.find((t) => t.key === DEFAULT_THEME)!

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

const STORE = 'mountain-path-color:theme'

/** 화면 전체에 테마 색을 반영 (CSS 변수 + 브라우저 상단 색) */
export function applyTheme(key?: string) {
  const t = themeOf(key)
  const root = document.documentElement
  for (const [shade, hex] of Object.entries(t.ui)) root.style.setProperty(`--m-${shade}`, rgb(hex))
  root.dataset.theme = t.key
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.ui[100])
  try { localStorage.setItem(STORE, t.key) } catch { /* 저장 못 해도 화면은 그대로 동작 */ }
}

/** 첫 화면이 깜빡이지 않도록, 마지막으로 고른 테마를 프로필보다 먼저 적용 */
export function applySavedTheme() {
  let key: string | undefined
  try { key = localStorage.getItem(STORE) ?? undefined } catch { /* 없음 */ }
  applyTheme(key)
}
