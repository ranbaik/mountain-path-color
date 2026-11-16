import { describe, expect, it } from 'vitest'
import { emptyMeditation, type Meditation, type Sermon } from '../db'
import { SHAREABLE_FIELDS, buildGroupShareText, toShareable, type ShareableField } from './privacy'

const SECRET = '비밀기도-절대-나가면-안됨-7f3a'
const sermon: Sermon = {
  id: 's1', date: '2026-11-15', title: '산 위에서 주신 복', passage: '마태복음 5:1-16', preacher: '목사',
  groupQuestions: ['가장 마음에 남은 복은?'],
}
const med = (weekday: 1 | 2 | 3 | 4 | 5): Meditation => ({
  ...emptyMeditation('s1', weekday),
  observe: `관찰${weekday}`, interpret: `해석${weekday}`, apply: `적용${weekday}`, remembered: `남은말씀${weekday}`,
  prayer: `${SECRET}-${weekday}`,
})

describe('기도 비공개', () => {
  it('toShareable 결과에 기도가 없다', () => {
    const s = toShareable(med(1))
    expect(JSON.stringify(s)).not.toContain(SECRET)
    expect(s).not.toHaveProperty('prayer')
    expect(s.observe).toBe('관찰1')
  })

  it("허용 목록 밖의 칸을 요청해도 무시한다 ('prayer' 를 억지로 넣어도)", () => {
    const s = toShareable(med(2), ['observe', 'prayer' as unknown as ShareableField])
    expect(JSON.stringify(s)).not.toContain(SECRET)
    expect(s).toEqual({ weekday: 2, observe: '관찰2' })
  })

  it('목장 나눔 텍스트에 기도가 없다 (모든 칸을 골라도)', () => {
    const text = buildGroupShareText({
      sermon, meditations: [med(1), med(2), med(3), med(4), med(5)], fields: SHAREABLE_FIELDS, name: '성도', appName: '말씀의 빛, 세상으로',
    })
    expect(text).not.toContain(SECRET)
    expect(text).toContain('관찰3')
    expect(text).toContain('가장 마음에 남은 복은?')
  })

  it('기도만 쓴 날은 나눔에 나타나지 않는다', () => {
    const onlyPrayer = { ...emptyMeditation('s1', 4), prayer: SECRET }
    const text = buildGroupShareText({ sermon, meditations: [onlyPrayer], fields: ['observe', 'apply'], appName: 'x' })
    expect(text).not.toContain(SECRET)
    expect(text).not.toContain('목요일')
  })

  it('허용 목록에 prayer 가 들어 있지 않다', () => {
    expect(SHAREABLE_FIELDS as readonly string[]).not.toContain('prayer')
  })
})
