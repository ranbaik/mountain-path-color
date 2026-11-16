import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' : 어떤 경로에 올려도 동작 (Vercel, 정적 호스팅 공통)
export default defineConfig({
  base: './',
  plugins: [react()],
  // 브라우저 저장 데이터(IndexedDB)는 주소(포트)별로 따로 저장되므로 항상 같은 포트로 띄움
  server: { port: 5178, strictPort: true },
  build: { chunkSizeWarningLimit: 1200 },
})
