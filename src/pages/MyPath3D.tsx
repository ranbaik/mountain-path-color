import { Billboard, Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import BottomNav from '../components/BottomNav'
import { db, hasContent, type Meditation, type Sermon } from '../db'
import { makeFaceCanvas, type AvatarGender } from '../lib/avatar'
import { useProfile } from '../lib/profile'
import { useSermons } from '../lib/sermons'
import { WEEKDAYS, dayPlans, fmtDate, parseDate } from '../lib/split'
import { themeOf, type Theme } from '../lib/theme'

type Walk = 'idle' | 'walking' | 'paused'
const STEP_Y = 1.25      // 정거장(주일)마다 오르는 높이
const K = 12             // 정거장 사이를 산 겉면을 따라 잇는 점 수
const SWING = 0.5        // 길이 좌우로 꺾이는 각도(라디안). 산 앞면 안에서만 오가서 고정된 시점에서 길 전체가 보임

/* 3D 라벨(Html)을 React가 관리하지 않는 별도 레이어에 붙여 화면 전환 시 DOM 충돌 방지 */
const LabelLayer = createContext<RefObject<HTMLDivElement | null> | null>(null)
function Label(props: React.ComponentProps<typeof Html>) {
  const portal = useContext(LabelLayer)
  return <Html {...props} portal={(portal ?? undefined) as RefObject<HTMLElement> | undefined} />
}

/* ───────────── 산과 지그재그 산길 ───────────── */

/** 같은 산은 늘 같은 모양으로 꾸며지도록 고정 씨앗 난수 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 원뿔 산의 **앞면(카메라 쪽)** 을 좌우로 꺾어 오르는 지그재그 길.
 * 산 뒤로 돌아가지 않으므로 화면을 돌리지 않아도 길과 아바타가 늘 보임.
 * 점 0 = 등산로 입구(출발), 정거장 i 는 곡선 위 i·K 번째 점. 설교가 늘수록 산이 커짐.
 */
function useMountain(count: number) {
  return useMemo(() => {
    const n = count + 1
    const H = (n - 1) * STEP_Y + 4.5                    // 산 높이 (정상은 마지막 정거장보다 위)
    const R0 = Math.max(8, Math.sqrt(n) * 3.2)          // 산 밑면 반지름
    const surf = (y: number) => Math.max(0, R0 * (1 - (y + 0.6) / H))  // 그 높이의 산 겉면 반지름
    const at = (a: number, y: number) => { const r = surf(y) + 0.5; return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r) }
    const angle = (i: number) => (i === 0 ? 0 : i % 2 ? -SWING : SWING)
    const pts: THREE.Vector3[] = [at(0, 0)]
    for (let i = 1; i < n; i++) {
      const a0 = angle(i - 1), a1 = angle(i), y0 = (i - 1) * STEP_Y
      for (let k = 1; k <= K; k++) pts.push(at(a0 + (a1 - a0) * (k / K), y0 + STEP_Y * (k / K)))
    }
    if (pts.length === 1) pts.push(pts[0].clone().add(new THREE.Vector3(0, 0.01, 0.5))) // 곡선은 점이 2개 이상 필요
    const last = pts.length - 1
    // CatmullRom 의 getPoint(t)는 t = j/last 에서 정확히 j번째 점을 지남
    const tAt = (i: number) => (last === 0 ? 0 : Math.min((i * K) / last, 1))
    const stationAt = (t: number) => Math.round((t * last) / K)
    const stations = Array.from({ length: n }, (_, i) => pts[Math.min(i * K, last)])
    return { curve: new THREE.CatmullRomCurve3(pts), stations, tAt, stationAt, H, R0, surf }
  }, [count])
}
type MountainShape = ReturnType<typeof useMountain>

/** 산: 산자락 → 중턱 → 윗자락 3색이 이어지고 꼭대기는 눈. 면마다 살짝 다른 색이라 바위산 느낌 */
function Mountain({ H, R0, theme }: { H: number; R0: number; theme: Theme }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(R0, H, 72, 30, true)
    const pos = g.attributes.position
    const [c0, c1, c2] = theme.mountain.map((h) => new THREE.Color(h))
    const snow = new THREE.Color('#ffffff')
    const rnd = seeded(7)
    const c = new THREE.Color()
    const cols: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getY(i) + H / 2) / H                 // 0 = 산자락, 1 = 정상
      if (h < 0.42) c.copy(c0).lerp(c1, h / 0.42)
      else if (h < 0.78) c.copy(c1).lerp(c2, (h - 0.42) / 0.36)
      else c.copy(c2).lerp(snow, Math.min(1, (h - 0.78) / 0.07))
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.06)
      cols.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    return g
  }, [H, R0, theme])
  return (
    <group>
      <mesh geometry={geo} position={[0, H / 2 - 0.6, 0]}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* 정상의 십자가 */}
      <group position={[0, H - 0.6, 0]}>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.12, 1.8, 0.12]} /><meshStandardMaterial color="#e7964a" emissive="#e7964a" emissiveIntensity={0.5} /></mesh>
        <mesh position={[0, 1.3, 0]}><boxGeometry args={[0.9, 0.12, 0.12]} /><meshStandardMaterial color="#e7964a" emissive="#e7964a" emissiveIntensity={0.5} /></mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.62, 0]}>
        <circleGeometry args={[R0 * 2.2, 64]} /><meshStandardMaterial color={theme.ground} />
      </mesh>
    </group>
  )
}

/* ───────────── 산 꾸미기: 나무 · 바위 · 꽃 · 구름 (움직이지 않음) ───────────── */

interface Item { pos: THREE.Vector3; scale: number; rot?: number; color?: string }

/** 같은 모양을 여러 개 한 번에 그림 (나무 100그루도 가볍게) */
function Many({ geometry, items, color, roughness = 0.9 }: { geometry: THREE.BufferGeometry; items: Item[]; color?: string; roughness?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      o.position.copy(it.pos); o.scale.setScalar(it.scale); o.rotation.set(0, it.rot ?? 0, 0); o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.color) m.setColorAt(i, c.set(it.color))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color ?? '#ffffff'} roughness={roughness} flatShading />
    </instancedMesh>
  )
}

const GEO = {
  pineLow: new THREE.ConeGeometry(0.5, 0.9, 7).translate(0, 0.85, 0),
  pineTop: new THREE.ConeGeometry(0.36, 0.7, 7).translate(0, 1.35, 0),
  roundLow: new THREE.IcosahedronGeometry(0.52, 0).translate(0, 0.95, 0),
  roundTop: new THREE.IcosahedronGeometry(0.36, 0).translate(0.12, 1.4, 0.05),
  trunk: new THREE.CylinderGeometry(0.07, 0.1, 0.6, 6).translate(0, 0.3, 0),
  rock: new THREE.DodecahedronGeometry(0.3, 0),
  flower: new THREE.IcosahedronGeometry(0.09, 0),
  cloud: new THREE.IcosahedronGeometry(1, 1),
}

function pickFrom<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function Scenery({ m, theme }: { m: MountainShape; theme: Theme }) {
  const { curve, H, R0, surf } = m
  const s = useMemo(() => {
    const rnd = seeded(2026)
    const path = curve.getSpacedPoints(400)
    const nearPath = (v: THREE.Vector3, d: number) => path.some((p) => p.distanceToSquared(v) < d * d)
    const onSlope = (a: number, y: number) => { const r = surf(y) - 0.05; return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r) }

    const trees: Item[] = []
    const want = Math.round(Math.min(160, Math.max(55, R0 * 7)))
    for (let tries = 0; trees.length < want && tries < want * 8; tries++) {
      const y = Math.pow(rnd(), 1.25) * H * 0.7 - 0.5
      const pos = onSlope(rnd() * Math.PI * 2, y)
      if (nearPath(pos, 1.35)) continue
      trees.push({ pos, scale: 0.65 + rnd() * 0.6, rot: rnd() * 6, color: pickFrom(rnd, theme.trees) })
    }
    // 산 밑 들판의 나무 (출발점 앞은 비워 둠)
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2, r = R0 * (1.08 + rnd() * 0.85)
      const pos = new THREE.Vector3(Math.sin(a) * r, -0.6, Math.cos(a) * r)
      if (Math.abs(pos.x) < 4 && pos.z > 0) continue
      trees.push({ pos, scale: 0.8 + rnd() * 0.7, rot: rnd() * 6, color: pickFrom(rnd, theme.trees) })
    }
    const rocks: Item[] = []
    for (let tries = 0; rocks.length < 26 && tries < 300; tries++) {
      const pos = onSlope(rnd() * Math.PI * 2, rnd() * H * 0.8 - 0.4)
      if (nearPath(pos, 1.1)) continue
      rocks.push({ pos, scale: 0.6 + rnd() * 1.1, rot: rnd() * 6, color: rnd() < 0.5 ? '#9a948f' : '#b9b2ab' })
    }
    const flowers: Item[] = []
    for (let k = 0; k < 140; k++) {
      const a = rnd() * Math.PI * 2, r = R0 * (1.01 + rnd() * 1.1)
      flowers.push({ pos: new THREE.Vector3(Math.sin(a) * r, -0.52, Math.cos(a) * r), scale: 0.8 + rnd() * 0.8, color: pickFrom(rnd, theme.flowers) })
    }
    // 구름: 산 옆과 뒤쪽에만 (길을 가리지 않게)
    const clouds: Item[] = []
    for (let k = 0; k < 6; k++) {
      const a = (k % 2 ? 1 : -1) * (1.25 + rnd() * 1.4)
      const r = R0 * (0.9 + rnd() * 0.7), y = H * (0.35 + rnd() * 0.6)
      const c = new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r)
      for (let b = 0; b < 4; b++) clouds.push({ pos: c.clone().add(new THREE.Vector3((b - 1.5) * 0.9, (rnd() - 0.3) * 0.4, (rnd() - 0.5) * 0.6)), scale: 0.55 + rnd() * 0.45 })
    }
    return { trees, rocks, flowers, clouds }
  }, [curve, H, R0, surf, theme])

  const round = theme.treeShape === 'round'
  const tops = useMemo(() => s.trees.map((t) => ({ ...t, color: '#' + new THREE.Color(t.color).offsetHSL(0, 0, 0.07).getHexString() })), [s.trees])
  return (
    <group>
      <Many geometry={GEO.trunk} items={s.trees} color="#8a6a4f" />
      <Many geometry={round ? GEO.roundLow : GEO.pineLow} items={s.trees} />
      <Many geometry={round ? GEO.roundTop : GEO.pineTop} items={tops} />
      <Many geometry={GEO.rock} items={s.rocks} />
      <Many geometry={GEO.flower} items={s.flowers} roughness={0.6} />
      <Many geometry={GEO.cloud} items={s.clouds} color="#ffffff" roughness={1} />
    </group>
  )
}

/** 그 주에 묵상하는 요일들 (본문을 못 읽으면 월~금) */
const weekdaysOf = (s: Sermon) => dayPlans(s)?.map((p) => WEEKDAYS[p.weekday - 1]) ?? WEEKDAYS.slice(0, 5)

/* 한 주 정거장: 발판 + 묵상하는 날 수만큼 돌 (월~금 5개, 매일 묵상이면 7개 · 묵상한 날은 빛남) */
function Station({ p, sermon, days, selected, onSelect, big, theme }: {
  p: THREE.Vector3; sermon: Sermon; days: boolean[]; selected: boolean; onSelect: (s: Sermon) => void; big: boolean; theme: Theme
}) {
  const outward = new THREE.Vector3(p.x, 0, p.z).normalize()
  const side = new THREE.Vector3(-outward.z, 0, outward.x)
  const count = days.filter(Boolean).length
  return (
    <group>
      <mesh position={p} onClick={(e) => { e.stopPropagation(); onSelect(sermon) }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <cylinderGeometry args={[0.85, 0.95, 0.2, 36]} />
        <meshStandardMaterial color={count ? theme.ui[500] : theme.ui[200]} emissive={selected ? '#e7964a' : '#000'} emissiveIntensity={selected ? 0.4 : 0} />
      </mesh>
      {days.map((on, k) => {
        const off = (k - (days.length - 1) / 2) * (days.length > 5 ? 0.34 : 0.42)
        const pos = new THREE.Vector3(p.x + outward.x * 1.25 + side.x * off, p.y + 0.18, p.z + outward.z * 1.25 + side.z * off)
        return (
          <mesh key={k} position={pos}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color={on ? '#f7c48b' : '#d6d1d8'} emissive={on ? '#e7964a' : '#000'} emissiveIntensity={on ? 0.9 : 0} />
          </mesh>
        )
      })}
      <Label position={[p.x + outward.x * 0.2, p.y - 0.55, p.z + outward.z * 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 font-semibold text-ink-700 shadow ${big ? 'text-[14px]' : 'text-[11px]'}`}>
          {fmtDate(parseDate(sermon.date))} · {sermon.title.length > 9 ? sermon.title.slice(0, 9) + '…' : sermon.title}
        </div>
      </Label>
    </group>
  )
}

/* ───────────── 아바타 ───────────── */

function useFaceTexture(photo: string | undefined, gender: AvatarGender) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    makeFaceCanvas({ photo, gender }).then((c) => {
      if (!alive) return
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      setTex(t)
    })
    return () => { alive = false }
  }, [photo, gender])
  return tex
}

function Limb({ x, y, len, r, color, swing, phase }: { x: number; y: number; len: number; r: number; color: string; swing: React.RefObject<number>; phase: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.x = Math.sin(clock.elapsedTime * 9 + phase) * 0.6 * (swing.current ?? 0) })
  return (
    <group ref={ref} position={[x, y, 0]}>
      <mesh position={[0, -len / 2, 0]}><capsuleGeometry args={[r, len - r * 2, 4, 12]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  )
}

function Avatar({ curve, tAt, homeIdx, walk, progress, photo, gender, name }: {
  curve: THREE.CatmullRomCurve3; tAt: (i: number) => number; homeIdx: number; walk: Walk
  progress: React.RefObject<number>; photo?: string; gender: AvatarGender; name: string
}) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const swing = useRef(0)
  const onPath = walk !== 'idle'
  const moving = walk === 'walking'
  const wasOnPath = useRef(onPath)
  const face = useFaceTexture(photo, gender)
  const female = gender === 'female'
  const outfit = female ? '#e7964a' : '#4f7fb6'
  const pants = female ? '#f6d9c0' : '#34405a'

  useFrame(({ clock, camera }) => {
    const g = root.current
    if (!g) return
    const t = onPath ? (progress.current ?? 0) : tAt(homeIdx)
    const p = curve.getPoint(t)
    const target = new THREE.Vector3(p.x, p.y + 0.12, p.z)
    const facing = moving ? curve.getTangent(t) : new THREE.Vector3(camera.position.x - p.x, 0, camera.position.z - p.z)
    const snap = onPath !== wasOnPath.current
    wasOnPath.current = onPath
    g.position.lerp(target, snap || onPath ? 1 : 0.12)
    const yaw = Math.atan2(facing.x, facing.z)
    g.rotation.y += Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y)) * 0.15
    swing.current += ((moving ? 1 : 0) - swing.current) * 0.1
    if (body.current) body.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.06 * swing.current
  })

  return (
    <group ref={root} scale={0.75}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.38, 32]} /><meshBasicMaterial color="#2d2a2e" transparent opacity={0.2} />
      </mesh>
      <group ref={body}>
        <Limb x={-0.11} y={0.58} len={0.58} r={0.075} color={pants} swing={swing} phase={0} />
        <Limb x={0.11} y={0.58} len={0.58} r={0.075} color={pants} swing={swing} phase={Math.PI} />
        {female ? (
          <>
            <mesh position={[0, 0.82, 0]}><coneGeometry args={[0.4, 0.62, 32]} /><meshStandardMaterial color={outfit} /></mesh>
            <mesh position={[0, 1.13, 0]}><cylinderGeometry args={[0.17, 0.2, 0.3, 24]} /><meshStandardMaterial color={outfit} /></mesh>
          </>
        ) : (
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.25, 0.22, 0.66, 24]} /><meshStandardMaterial color={outfit} /></mesh>
        )}
        <Limb x={-0.29} y={1.2} len={0.5} r={0.06} color={female ? '#f6d9c0' : outfit} swing={swing} phase={Math.PI} />
        <Limb x={0.29} y={1.2} len={0.5} r={0.06} color={female ? '#f6d9c0' : outfit} swing={swing} phase={0} />
        <mesh position={[0, 1.33, 0]}><cylinderGeometry args={[0.07, 0.08, 0.12, 12]} /><meshStandardMaterial color="#f6d9c0" /></mesh>
        <Billboard position={[0, 1.72, 0]}>
          {face && <mesh><circleGeometry args={[0.4, 48]} /><meshBasicMaterial map={face} transparent toneMapped={false} /></mesh>}
        </Billboard>
        <Label position={[0, 2.3, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-full bg-moss-700 px-2 py-0.5 text-[11px] font-bold text-white shadow">{name}</div>
        </Label>
      </group>
    </group>
  )
}

/* 전경 시점: 산 앞에서 정면으로. 산 전체가 들어오도록 (세로 화면은 더 멀리). 저절로 돌지 않음 */
function overview(camera: THREE.Camera, controls: OrbitControlsImpl | null, H: number, R0: number, aspect: number) {
  const far = (aspect < 0.8 ? 1.95 : 1) * Math.max(R0 * 1.9, H * 1.05, 16)
  camera.position.set(0, H * 0.42 + far * 0.28, far)
  controls?.target.set(0, H * 0.4, 0)
  camera.lookAt(0, H * 0.4, 0)
  controls?.update()
}

/**
 * 올라 보기: 카메라는 **방향을 바꾸지 않고** 아바타를 따라 위·옆으로만 옮겨 감.
 * (예전처럼 산을 빙 돌지 않아서 길이 움직이는 것처럼 보이지 않음)
 */
function CameraRig({ walk, m, n, endIdx, progress, onStation, onDone }: {
  walk: Walk; m: MountainShape; n: number; endIdx: number; progress: React.RefObject<number>
  onStation: (i: number | null) => void; onDone: () => void
}) {
  const { camera, size } = useThree()
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null
  const last = useRef<number | null>(null)
  const aspect = size.width / size.height
  const { curve, tAt, stationAt, H, R0 } = m

  useEffect(() => {
    if (walk !== 'idle') return
    progress.current = 0
    last.current = null
    onStation(null)
    overview(camera, controls, H, R0, aspect)
  }, [walk, controls, progress, onStation, camera, aspect, H, R0])

  const end = tAt(endIdx)
  const want = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    if (walk !== 'walking') return
    // 한 주 구간을 약 2.2초에 오름
    const t = (progress.current = Math.min((progress.current ?? 0) + delta / (2.2 * Math.max(n - 1, 1)), end))
    const p = curve.getPoint(t)
    const dist = (aspect < 0.8 ? 1.25 : 1) * Math.max(10, R0 * 1.05)
    look.set(p.x * 0.7, p.y + 0.9, p.z)
    want.set(p.x * 0.7, p.y + 0.9 + dist * 0.3, p.z + dist)
    camera.position.lerp(want, 0.06)
    const target = controls?.target ?? look
    target.lerp(look, 0.06)
    camera.lookAt(target)
    const idx = stationAt(t) - 1 // 점 0은 등산로 입구
    if (idx !== last.current) { last.current = idx; onStation(idx >= 0 ? idx : null) }
    if (t >= end) onDone()
  })
  return null
}

function PathWorld({ sermons, meds, selected, onSelect, walk, onWalkDone, onStation, avatar, homeIdx, big, theme }: {
  sermons: Sermon[]; meds: Meditation[]; selected?: Sermon; onSelect: (s?: Sermon) => void; walk: Walk; onWalkDone: () => void
  onStation: (i: number | null) => void; avatar: { name: string; gender: AvatarGender; photo?: string }; homeIdx: number; big: boolean; theme: Theme
}) {
  const m = useMountain(sermons.length)
  const { curve, stations, tAt, H, R0 } = m
  const n = sermons.length + 1
  const tube = useMemo(() => new THREE.TubeGeometry(curve, Math.max(80, n * K * 3), 0.22, 8, false), [curve, n])
  const progress = useRef(0)

  return (
    <>
      <Mountain H={H} R0={R0} theme={theme} />
      <Scenery m={m} theme={theme} />
      <mesh geometry={tube}><meshStandardMaterial color={theme.path} roughness={0.9} /></mesh>
      <Label position={[stations[0].x, stations[0].y - 0.5, stations[0].z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full bg-moss-700/90 px-2 py-0.5 text-[11px] font-semibold text-white">🚩 출발</div>
      </Label>
      {sermons.map((s, i) => (
        <Station key={s.id} p={stations[i + 1]} sermon={s} selected={selected?.id === s.id} onSelect={onSelect} big={big} theme={theme}
          days={weekdaysOf(s).map((d) => hasContent(meds.find((x) => x.sermonId === s.id && x.weekday === d.key)))} />
      ))}
      <Avatar curve={curve} tAt={tAt} homeIdx={homeIdx + 1} walk={walk} progress={progress}
        photo={avatar.photo} gender={avatar.gender} name={avatar.name} />
      <CameraRig walk={walk} m={m} n={n} endIdx={homeIdx + 1} progress={progress} onStation={onStation} onDone={onWalkDone} />
    </>
  )
}

/* ───────────── 페이지 ───────────── */

export default function MyPath3D() {
  const labelRef = useRef<HTMLDivElement>(null)
  const profile = useProfile()
  const { sermons } = useSermons()
  const meds = useLiveQuery(() => db.meditations.toArray(), [], [] as Meditation[])
  const [selected, setSelected] = useState<Sermon | undefined>()
  const [walk, setWalk] = useState<Walk>('idle')
  const [station, setStation] = useState<number | null>(null)
  const [help, setHelp] = useState(true)
  const walking = walk === 'walking'
  const big = !!profile?.seniorMode
  const theme = themeOf(profile?.theme)

  // 아바타 위치 = 묵상 기록이 하루라도 있는 가장 최근 주 (-1 = 아직 출발 전)
  const homeIdx = sermons.reduce((acc, s, i) => (meds.some((m) => m.sermonId === s.id && hasContent(m)) ? i : acc), -1)
  const climbed = sermons.filter((s) => meds.some((m) => m.sermonId === s.id && hasContent(m))).length
  const selDays = selected ? weekdaysOf(selected).filter((d) => hasContent(meds.find((m) => m.sermonId === selected.id && m.weekday === d.key))) : []
  const select = (s?: Sermon) => { setSelected(s); if (s) setWalk((w) => (w === 'walking' ? 'paused' : w)) }

  return (
    <div className="flex h-dvh flex-col" style={{ background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]})` }}>
      <header className="safe-top z-10 px-4 pb-2">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <h1 className="flex-1 font-serif text-lg font-bold">⛰️ 나의 길</h1>
          <span className="text-sm text-ink-700">⛰️ {climbed}주 묵상 · {sermons.length}개 정거장</span>
        </div>
      </header>

      <div className="relative flex-1">
        {sermons.length === 0 ? (
          <p className="p-10 text-center text-ink-500">아직 등록된 설교가 없어요. 설교가 올라오면 산길이 생겨요.</p>
        ) : (
          <>
            <Canvas camera={{ position: [24, 16, 24], fov: 50 }} dpr={[1, 2]} onPointerMissed={() => setSelected(undefined)}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 20, 8]} intensity={1.2} />
              <hemisphereLight args={['#ffffff', theme.mountain[1], 0.5]} />
              {/* 화면이 저절로 돌지 않도록 회전은 끔. 손가락으로 끌면 위아래·옆으로 옮겨 보고, 두 손가락으로 확대 */}
              <OrbitControls makeDefault enabled={!walking} enableDamping enableRotate={false} screenSpacePanning
                mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
                touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }} minDistance={4} maxDistance={140} />
              <LabelLayer.Provider value={labelRef}>
                <PathWorld sermons={sermons} meds={meds} selected={selected} onSelect={select} walk={walk} big={big} theme={theme}
                  onWalkDone={() => setWalk('paused')} onStation={setStation} homeIdx={homeIdx}
                  avatar={{ name: profile?.name || '나', gender: profile?.avatarGender ?? 'female', photo: profile?.avatarPhoto }} />
              </LabelLayer.Provider>
            </Canvas>
            <div ref={labelRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />

            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-2">
              {walk === 'idle' && homeIdx >= 0 && (
                <button className="btn-primary whitespace-nowrap !px-5 !py-2 text-sm" onClick={() => { setSelected(undefined); setWalk('walking') }}>▶ 처음부터 올라 보기</button>
              )}
              {walk === 'walking' && <button className="btn-primary whitespace-nowrap !px-5 !py-2 text-sm" onClick={() => setWalk('paused')}>⏸ 잠깐 쉬기</button>}
              {walk === 'paused' && (
                <>
                  {station !== homeIdx && <button className="btn-primary whitespace-nowrap !px-4 !py-2 text-sm" onClick={() => { setSelected(undefined); setWalk('walking') }}>▶ 이어 오르기</button>}
                  <button className="btn-ghost whitespace-nowrap bg-white/90 !px-4 !py-2 text-sm" onClick={() => { setSelected(undefined); setWalk('idle') }}>■ 전체 보기</button>
                </>
              )}
            </div>

            {walk !== 'idle' && !selected && station !== null && sermons[station] && (
              <div className="pointer-events-none absolute inset-x-3 top-16 z-20 mx-auto max-w-sm rounded-2xl bg-white/90 px-4 py-2.5 text-center shadow-card">
                <p className="text-xs font-semibold text-moss-700">{fmtDate(parseDate(sermons[station].date))} 주일</p>
                <p className="mt-0.5 text-sm text-ink-700">{sermons[station].title} · {sermons[station].passage}</p>
              </div>
            )}

            {walk === 'idle' && !selected && help && (
              <div className="absolute inset-x-3 bottom-24 z-20 mx-auto max-w-md rounded-2xl bg-white/90 p-3 pr-8 text-[13px] leading-relaxed text-ink-700 shadow">
                <button className="absolute right-3 top-2 text-ink-500" aria-label="설명 닫기" onClick={() => setHelp(false)}>✕</button>
                <b>주일마다 정거장이 하나씩</b> 생기는 산길이에요. 길은 산 앞면을 지그재그로 올라가요. 정거장 옆 작은 돌은 그 주의 묵상 날들이고,
                묵상한 날은 <span className="font-semibold text-dawn-700">빛나요</span>.
                아바타는 내가 묵상한 가장 최근 주까지 올라가 있어요.
                {homeIdx < 0 && <span className="mt-1 block font-semibold text-moss-700">아직 출발 전이에요. 오늘 묵상을 하면 첫 정거장으로 올라가요!</span>}
              </div>
            )}

            {selected && (
              <div className="absolute inset-x-3 bottom-24 z-20 mx-auto max-w-md rounded-3xl bg-white/95 p-4 shadow-card">
                <div className="flex items-center text-xs text-ink-500">
                  <span>{fmtDate(parseDate(selected.date))} 주일{selected.preacher ? ` · ${selected.preacher}` : ''}</span>
                  <button className="ml-auto text-ink-500" aria-label="닫기" onClick={() => setSelected(undefined)}>✕</button>
                </div>
                <p className="mt-1 font-serif text-lg font-bold">{selected.title}</p>
                <p className="text-sm text-ink-500">{selected.passage}</p>
                <div className="mt-2 flex items-center gap-1">
                  {weekdaysOf(selected).map((d) => (
                    <span key={d.key} className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${selDays.includes(d) ? 'bg-dawn-300 text-ink-900' : 'bg-moss-50 text-ink-300'}`}>{d.short}</span>
                  ))}
                  <Link to={`/day/${selected.id}/${weekdaysOf(selected)[0]?.key ?? 1}`} className="ml-auto text-sm font-semibold text-moss-700">이 주 묵상 →</Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
