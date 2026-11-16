import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { loadConfig } from '../config'
import { db, type Sermon } from '../db'

export const byDate = (a: Sermon, b: Sermon) => a.date.localeCompare(b.date)

function isSermon(x: unknown): x is Sermon {
  const s = x as Sermon
  return !!s && typeof s.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && typeof s.title === 'string' && typeof s.passage === 'string'
}

/** sermons.json 을 받아 기기에 캐시. 네트워크가 안 되면 마지막으로 받은 목록을 씀 */
async function refreshFeed() {
  const cfg = await loadConfig()
  const r = await fetch(cfg.sermonsUrl, { cache: 'no-cache' })
  if (!r.ok) throw new Error(`설교 목록을 받지 못했어요 (${r.status})`)
  const list = await r.json()
  if (!Array.isArray(list)) throw new Error('설교 목록 형식이 올바르지 않아요')
  const sermons = list.filter(isSermon)
  await db.cache.put({ id: 'feed', sermons, fetchedAt: Date.now() })
}

let refreshing: Promise<void> | null = null

/**
 * 설교 목록 (날짜순). 담당자가 이 기기에 저장한 미리보기(draft)는 같은 id면 덮어씀.
 * offline: 네트워크 실패로 캐시를 보여주는 중
 */
export function useSermons() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    refreshing ??= refreshFeed().finally(() => { refreshing = null })
    refreshing.then(() => setOffline(false), () => setOffline(true))
  }, [])
  const data = useLiveQuery(async () => {
    const [feed, draft] = await Promise.all([db.cache.get('feed'), db.cache.get('draft')])
    return { feed, draft }
  }, [])
  const loading = data === undefined || (!data.feed && refreshing !== null && !offline)
  const map = new Map<string, Sermon & { draft?: boolean }>()
  for (const s of data?.feed?.sermons ?? []) map.set(s.id, s)
  for (const s of data?.draft?.sermons ?? []) map.set(s.id, { ...s, draft: true })
  return { sermons: [...map.values()].sort(byDate), loading, offline, feed: data?.feed?.sermons ?? [], drafts: data?.draft?.sermons ?? [] }
}
