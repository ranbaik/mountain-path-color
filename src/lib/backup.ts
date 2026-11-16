import { db, type Meditation, type Profile } from '../db'

/**
 * 기기 안 백업 파일. 기도(prayer)가 그대로 들어가는 **유일한** 내보내기.
 * 다른 사람에게 보내지 않도록 화면에서 경고함.
 */
interface BackupFile {
  app: 'mountain-path'; version: 1; exportedAt: string
  note: string
  profile?: Profile; meditations: Meditation[]
}

export async function exportBackup() {
  const data: BackupFile = {
    app: 'mountain-path', version: 1, exportedAt: new Date().toISOString(),
    note: '이 파일에는 기도 내용이 들어 있습니다. 다른 사람에게 보내지 마세요.',
    profile: await db.profile.get('me'), meditations: await db.meditations.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mountain-path-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importBackup(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as BackupFile
  if (data.app !== 'mountain-path' || !Array.isArray(data.meditations)) throw new Error('말씀 묵상 앱 백업 파일이 아닙니다.')
  await db.transaction('rw', db.meditations, db.profile, async () => {
    if (data.profile) {
      const cur = await db.profile.get('me')
      await db.profile.put({
        ...data.profile, id: 'me',
        avatarGender: data.profile.avatarGender ?? cur?.avatarGender,
        avatarPhoto: data.profile.avatarPhoto ?? cur?.avatarPhoto,
      })
    }
    // 같은 날 기록이 기기에도 있으면 더 최근에 고친 쪽을 남김
    const existing = new Map((await db.meditations.toArray()).map((m) => [m.id, m]))
    const incoming = data.meditations.filter((m) => !existing.has(m.id) || existing.get(m.id)!.updatedAt <= m.updatedAt)
    await db.meditations.bulkPut(incoming)
  })
  return data.meditations.length
}
