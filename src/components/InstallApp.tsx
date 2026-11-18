import { useState } from 'react'
import { isStandalone, platform, useInstall } from '../lib/install'

const STEPS: Record<'ios' | 'kakao' | 'android' | 'desktop', string[]> = {
  ios: ['Safari 아래쪽 가운데 공유 단추(네모에 ↑)를 눌러요.', '아래로 내려 ‘홈 화면에 추가’를 눌러요.', '오른쪽 위 ‘추가’를 누르면 끝!'],
  kakao: ['지금은 카카오톡 안에서 열려 있어요.', '오른쪽 위(아이폰은 오른쪽 아래) ⋮ 메뉴 → ‘다른 브라우저로 열기’를 눌러요.', '열린 화면의 더보기에서 이 단추를 다시 눌러 주세요.'],
  android: ['오른쪽 위 ⋮ 메뉴를 눌러요. (삼성 인터넷은 아래쪽 ≡)', '‘앱 설치’ 또는 ‘홈 화면에 추가’를 눌러요.', '‘설치’를 누르면 끝!'],
  desktop: ['휴대폰에서 이 주소를 열어 주세요.', '아이폰은 Safari, 갤럭시는 Chrome이나 삼성 인터넷으로 열면 돼요.'],
}

/** 📲 휴대폰에 앱으로 설치하기 (안드로이드는 바로 설치 창, 아이폰·카카오톡은 따라 하기 안내) */
export default function InstallApp() {
  const { canPrompt, install } = useInstall()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  if (isStandalone() || done) return null
  const p = platform()

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-3">
        <img src="./icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-card" />
        <div className="min-w-0">
          <h2 className="font-semibold">📲 휴대폰에 앱으로 설치하기</h2>
          <p className="text-sm text-ink-500">홈 화면 아이콘으로 바로 열리고, 인터넷이 없어도 열려요.</p>
        </div>
      </div>
      <button className="btn-primary w-full"
        onClick={async () => { if (canPrompt) { if (await install()) setDone(true) } else setOpen((o) => !o) }}>
        {canPrompt ? '📲 지금 설치하기' : open ? '닫기' : '📲 설치 방법 보기'}
      </button>
      {open && !canPrompt && (
        <ol className="list-decimal space-y-1.5 rounded-2xl bg-moss-50 p-4 pl-8 text-[15px] leading-relaxed">
          {STEPS[p].map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
      <p className="rounded-xl bg-dawn-50 px-3 py-2 text-xs leading-relaxed text-dawn-700">
        💡 묵상 기록은 앱을 연 곳마다 따로 저장돼요. 설치한 뒤에는 <b>홈 화면 아이콘으로만</b> 열어 주세요.
        여기에 쓴 기록이 있다면 아래 ‘💾 백업 저장’ 후 설치한 앱에서 ‘복원’하면 옮겨져요.
      </p>
    </section>
  )
}
