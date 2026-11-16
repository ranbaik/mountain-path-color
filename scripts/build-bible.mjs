// 개역한글 JSONL(한 줄에 한 절) → 책별 JSON(public/bible/krv/NN.json) + 책 목록(src/data/books.ts)
// 사용법: node scripts/build-bible.mjs <krv_holybible.jsonl 경로>
// 원본: github.com/crizin/bible-db data/krv/krv_holybible.jsonl
// 출처 표기: 성경전서 개역한글판 (대한성서공회) — 퍼블릭 도메인. 본문은 고치지 않고 그대로 옮김.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ABBR = ['창', '출', '레', '민', '신', '수', '삿', '룻', '삼상', '삼하', '왕상', '왕하', '대상', '대하', '스', '느', '에', '욥', '시', '잠', '전', '아', '사', '렘', '애', '겔', '단', '호', '욜', '암', '옵', '욘', '미', '나', '합', '습', '학', '슥', '말',
  '마', '막', '눅', '요', '행', '롬', '고전', '고후', '갈', '엡', '빌', '골', '살전', '살후', '딤전', '딤후', '딛', '몬', '히', '약', '벧전', '벧후', '요일', '요이', '요삼', '유', '계']

const src = process.argv[2]
if (!src) { console.error('사용법: node scripts/build-bible.mjs <jsonl 경로>'); process.exit(1) }

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'bible', 'krv')
mkdirSync(outDir, { recursive: true })

/** @type {Map<number, { name: string; code: string; chapters: string[][] }>} */
const books = new Map()
for (const line of readFileSync(src, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const r = JSON.parse(line)
  let b = books.get(r.book)
  if (!b) { b = { name: r.name_kr, code: r.code, chapters: [] }; books.set(r.book, b) }
  const ch = (b.chapters[r.chapter - 1] ??= [])
  ch[r.verse - 1] = r.text
}

if (books.size !== 66) throw new Error(`책 수가 66이 아닙니다: ${books.size}`)
let total = 0, gaps = 0
const meta = []
for (let no = 1; no <= 66; no++) {
  const b = books.get(no)
  const chapters = Array.from({ length: b.chapters.length }, (_, i) => {
    const vs = b.chapters[i] ?? []
    return Array.from({ length: vs.length }, (_, j) => { if (vs[j] == null) gaps++; return vs[j] ?? '' })
  })
  total += chapters.reduce((n, c) => n + c.length, 0)
  writeFileSync(join(outDir, `${String(no).padStart(2, '0')}.json`), JSON.stringify(chapters))
  meta.push({ no, code: b.code, name: b.name, abbr: ABBR[no - 1], verses: chapters.map((c) => c.length) })
}

const ts = `// 자동 생성 파일 — scripts/build-bible.mjs 로 다시 만듦. 직접 고치지 마세요.
// 성경전서 개역한글판 (대한성서공회) · 퍼블릭 도메인
export interface BookMeta { no: number; code: string; name: string; abbr: string; verses: number[] }
export const BOOKS: BookMeta[] = ${JSON.stringify(meta)}
`
writeFileSync(join(root, 'src', 'data', 'books.ts'), ts)
console.log(`완료: 66권, ${total}절, 빈 절 ${gaps}개 → ${outDir}`)
