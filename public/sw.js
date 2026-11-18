/*
 * 인터넷이 없어도 앱이 열리도록 하는 서비스 워커.
 * - 화면(index.html), 설교 목록, 설정: 인터넷 먼저 → 안 되면 저장해 둔 것 (새 배포가 바로 반영됨)
 * - 빌드된 js/css(이름에 해시가 붙어 바뀌지 않음), 성경 본문, 그림, 글꼴: 저장해 둔 것 먼저
 * - 묵상 기록은 여기와 상관없이 IndexedDB 에 있으며, 이 파일은 어떤 기록도 밖으로 보내지 않음
 */
const VERSION = 'v1'
const CACHE = `malsseum-${VERSION}`
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon.svg', './config.json', './sermons.json']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(SHELL)
    // 첫 화면에 필요한 js·css 도 미리 저장 (index.html 안의 주소를 읽어서)
    try {
      const html = await (await fetch('./', { cache: 'no-cache' })).text()
      const urls = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1])
      await cache.addAll([...new Set(urls)])
    } catch { /* 다음 방문 때 저장됨 */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('malsseum-') && key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

const networkFirst = async (req, fallbackUrl) => {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(req, { cache: 'no-cache' })
    if (res.ok) cache.put(fallbackUrl ?? req, res.clone())
    return res
  } catch {
    const hit = await cache.match(fallbackUrl ?? req, { ignoreSearch: true })
    if (hit) return hit
    throw new Error('offline')
  }
}

const cacheFirst = async (req) => {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
  return res
}

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net']

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(req))
    return
  }
  if (!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './'))
    return
  }
  if (/\/(config|sermons)\.json$/.test(url.pathname)) {
    event.respondWith(networkFirst(req))
    return
  }
  event.respondWith(cacheFirst(req))
})
