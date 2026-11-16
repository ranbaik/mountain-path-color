import { useSyncExternalStore } from 'react'
import { loadConfig } from '../config'
import { db } from '../db'
import { saveProfile } from './profile'

/**
 * 배경음악. 화면을 옮겨 다녀도 끊기지 않도록 React 밖에 오디오 하나를 둠.
 * - 성도가 고른 음악 파일은 이 기기(IndexedDB)에만 저장. 저장소·백업·공유에 들어가지 않음
 * - config.json 의 bgmUrl 은 교회가 사용 허락을 받은 곡이 있을 때만 (기본은 비어 있음)
 * - 브라우저는 사용자가 화면을 누르기 전에는 소리를 못 내게 하므로, ‘켜 두기’ 상태면 첫 터치에 재생
 */
export interface BgmState {
  name: string
  source: 'mine' | 'church' | null
  playing: boolean
  volume: number
}

export const MAX_BGM_BYTES = 40 * 1024 * 1024

let state: BgmState = { name: '', source: null, playing: false, volume: 0.5 }
const subs = new Set<() => void>()
const set = (patch: Partial<BgmState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }

let audio: HTMLAudioElement | null = null
let objectUrl = ''
let resumeOnShow = false

function el() {
  if (!audio) {
    audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = state.volume
    audio.addEventListener('play', () => set({ playing: true }))
    audio.addEventListener('pause', () => set({ playing: false }))
    // 화면을 끄거나 다른 앱으로 가면 잠시 멈췄다가, 돌아오면 다시
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { resumeOnShow = !audio!.paused; audio!.pause() }
      else if (resumeOnShow) { resumeOnShow = false; audio!.play().catch(() => {}) }
    })
  }
  return audio
}

const nameOf = (file: string) => file.replace(/\.[^.]+$/, '')

function load(src: string, name: string, source: BgmState['source']) {
  const a = el()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = src.startsWith('blob:') ? src : ''
  a.src = src
  set({ name, source })
}

function unload() {
  const a = el()
  a.pause()
  a.removeAttribute('src')
  a.load()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
  set({ name: '', source: null, playing: false })
}

async function loadDefault() {
  const mine = await db.media.get('bgm')
  if (mine) return load(URL.createObjectURL(mine.blob), mine.name, 'mine')
  const cfg = await loadConfig()
  if (cfg.bgmUrl) return load(cfg.bgmUrl, cfg.bgmTitle || '교회 배경음악', 'church')
  unload()
}

let started = false
export async function initBgm() {
  if (started) return
  started = true
  const p = await db.profile.get('me')
  if (typeof p?.bgmVolume === 'number') { set({ volume: p.bgmVolume }); el().volume = p.bgmVolume }
  await loadDefault()
  if (p?.bgmOn && state.name) {
    const go = () => { el().play().catch(() => {}) }
    window.addEventListener('pointerdown', go, { once: true, capture: true })
  }
}

export async function playBgm() {
  if (!state.name) return
  try { await el().play() } catch { return }
  await saveProfile({ bgmOn: true })
}

export async function pauseBgm() {
  el().pause()
  await saveProfile({ bgmOn: false })
}

export function setBgmVolume(v: number) {
  el().volume = v
  set({ volume: v })
  void saveProfile({ bgmVolume: v })
}

/** 내 기기의 음악 파일을 배경음악으로 (이 기기에만 저장) */
export async function setMyBgm(file: File) {
  if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|oga|flac)$/i.test(file.name)) throw new Error('음악 파일(mp3 등)만 고를 수 있어요.')
  if (file.size > MAX_BGM_BYTES) throw new Error('파일이 너무 커요. 40MB 이하의 곡을 골라 주세요.')
  await db.media.put({ id: 'bgm', name: nameOf(file.name), type: file.type, blob: file, updatedAt: Date.now() })
  load(URL.createObjectURL(file), nameOf(file.name), 'mine')
  await playBgm()
}

export async function removeMyBgm() {
  el().pause()
  await db.media.delete('bgm')
  await loadDefault()
  await saveProfile({ bgmOn: false })
}

export function useBgm(): BgmState {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
}
