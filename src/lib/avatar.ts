/** 아바타 얼굴 이미지(원형) 생성 — 사진이 있으면 사진, 없으면 성별 기본 일러스트 */
export type AvatarGender = 'female' | 'male'

const SIZE = 256

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

/** 업로드한 사진 → 가운데 정사각형으로 잘라 320px JPEG dataURL (기기에만 저장) */
export async function resizePhoto(file: File, size = 320): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const s = Math.min(img.width, img.height)
    const c = document.createElement('canvas')
    c.width = c.height = size
    c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
    return c.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawIllustrated(ctx: CanvasRenderingContext2D, gender: AvatarGender) {
  const cx = SIZE / 2
  const hair = gender === 'female' ? '#5b3a2e' : '#2f2724'
  ctx.fillStyle = '#ffe3d8'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // 뒷머리
  ctx.fillStyle = hair
  if (gender === 'female') {
    ctx.beginPath()
    ctx.ellipse(cx, 118, 84, 88, 0, Math.PI, 0)
    ctx.lineTo(cx + 84, 236)
    ctx.quadraticCurveTo(cx, 250, cx - 84, 236)
    ctx.closePath()
    ctx.fill()
  }
  // 목·어깨
  ctx.fillStyle = gender === 'female' ? '#e97a5c' : '#4f8fd6'
  ctx.beginPath()
  ctx.ellipse(cx, 262, 92, 56, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f6c9b0'
  ctx.fillRect(cx - 18, 168, 36, 40)

  // 얼굴
  ctx.fillStyle = '#fbd7c2'
  ctx.beginPath()
  ctx.ellipse(cx, 128, 62, 70, 0, 0, Math.PI * 2)
  ctx.fill()

  // 앞머리
  ctx.fillStyle = hair
  ctx.beginPath()
  if (gender === 'female') {
    ctx.ellipse(cx, 98, 68, 50, 0, Math.PI, 0)
    ctx.quadraticCurveTo(cx + 20, 92, cx - 10, 112)
    ctx.quadraticCurveTo(cx - 40, 96, cx - 68, 116)
  } else {
    ctx.ellipse(cx, 96, 66, 44, 0, Math.PI, 0)
    ctx.quadraticCurveTo(cx + 30, 84, cx - 66, 104)
  }
  ctx.closePath()
  ctx.fill()

  // 눈·볼·입
  ctx.fillStyle = '#3a2a26'
  for (const dx of [-24, 24]) { ctx.beginPath(); ctx.arc(cx + dx, 132, 6, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = 'rgba(233,122,92,0.35)'
  for (const dx of [-38, 38]) { ctx.beginPath(); ctx.ellipse(cx + dx, 154, 11, 7, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.strokeStyle = '#c95c41'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, 152, 14, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
}

/** 원형 얼굴 캔버스 (테두리 포함) */
export async function makeFaceCanvas(opts: { photo?: string; gender: AvatarGender }): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const ctx = c.getContext('2d')!
  ctx.save()
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 8, 0, Math.PI * 2)
  ctx.clip()
  let drawn = false
  if (opts.photo) {
    try { ctx.drawImage(await loadImage(opts.photo), 0, 0, SIZE, SIZE); drawn = true } catch { /* 사진 오류 시 기본 아바타 */ }
  }
  if (!drawn) drawIllustrated(ctx, opts.gender)
  ctx.restore()
  ctx.lineWidth = 12
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 8, 0, Math.PI * 2)
  ctx.stroke()
  return c
}

export async function makeFaceDataUrl(opts: { photo?: string; gender: AvatarGender }) {
  return (await makeFaceCanvas(opts)).toDataURL('image/png')
}
