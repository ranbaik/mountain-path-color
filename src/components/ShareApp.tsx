import { useState } from 'react'
import { useConfig } from '../config'

/**
 * 📤 앱 소개하기: 목장 식구·목사님께 앱 주소를 보냄.
 * 카카오톡에 주소가 들어가면 index.html 의 og:image(산과 빛 그림) 썸네일이 함께 보임.
 * 내 묵상·기도·이름은 담지 않고 앱 주소와 소개 문구만 보냄.
 */
export default function ShareApp() {
  const cfg = useConfig()
  const [msg, setMsg] = useState('')
  const url = `${location.origin}${location.pathname}`
  const text = `✨ ${cfg.appName}\n주일 말씀을 날마다 한 걸음씩 함께 묵상해요 🙏\n오늘의 말씀 · 나의 길 · 목장 나눔 · 가정예배`
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3000) }

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: cfg.appName, text, url }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); flash('소개 글과 주소를 복사했어요. 카카오톡에 붙여 넣으면 그림과 함께 보여요.') }
    catch { flash(`주소: ${url}`) }
  }

  return (
    <section className="card overflow-hidden !p-0">
      <img src="./og-image.png" alt="빛나는 해와 십자가가 있는 산" className="aspect-[1200/630] w-full object-cover" loading="lazy" />
      <div className="space-y-2 p-5">
        <h2 className="font-semibold">📤 이 앱 소개하기</h2>
        <p className="text-sm text-ink-500">목장 식구, 목사님께 보내 보세요. 카카오톡에서 이 그림이 함께 보여요. 내 묵상과 기도는 보내지지 않아요.</p>
        <button onClick={share} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] px-6 py-3 font-semibold text-[#191919] shadow-card transition active:scale-[0.98]">
          <span aria-hidden>💬</span> 카카오톡으로 앱 소개하기
        </button>
        {msg && <p className="break-all text-center text-sm text-moss-700" role="status">{msg}</p>}
      </div>
    </section>
  )
}
