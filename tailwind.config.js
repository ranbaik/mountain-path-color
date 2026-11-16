/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 앱 색상 테마: 값은 src/lib/theme.ts 가 CSS 변수(--m-50 …)로 넣음 (주황·하늘·보라·분홍·초록)
        moss: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800].map((k) => [k, `rgb(var(--m-${k}) / <alpha-value>)`])),
        // 새벽 햇살 (강조)
        dawn: { 50: '#fff8ef', 100: '#fdeedd', 300: '#f7c48b', 500: '#e7964a', 700: '#b0621f' },
        ink: { 900: '#2d2a2e', 700: '#4b464d', 500: '#76707a', 300: '#c4bfc7' },
      },
      fontFamily: {
        sans: ['var(--app-font)', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
        serif: ['var(--app-font)', 'Pretendard', 'sans-serif'],   // 제목·본문도 고른 글꼴로 (lib/font.ts)
      },
      boxShadow: { card: '0 6px 24px -12px rgb(var(--m-800) / 0.3)' },
    },
  },
  plugins: [],
}
