// sound.ts — Howler wrapper của game mode (SPEC §9, ARCHITECTURE §1.1).
// Howler nạp CÙNG lazy chunk của game (import tĩnh trong module này — module
// chỉ được nạp khi người dùng vào game mode qua entry dynamic ssr:false).
// Quy tắc: unlock() phải được gọi TRONG handler của nút Bắt đầu (autoplay
// policy); mute ghi nhớ trong phiên game; rời mode -> stopAll() + unload.
//
// CẤM âm thanh xu/máy quay/jackpot và pack «Casino Audio» (SPEC §7.5/§9).
//
// Tick/drum của G2 ĐÃ nối mapping theo vận tốc/thời gian còn lại qua
// tick-map.ts (hàm thuần, có spec): cao độ + âm lượng tiếng «tách» là hàm
// của vận tốc góc hiện tại; nhịp trống là hàm của thời gian còn lại. Cả
// hai mù trước vị trí ô/người chơi — đúng SPEC §7.5.

import { Howl, Howler } from 'howler';
import type { GameSound } from '../phaser/bridge';
import { drumRate, drumVolume, tickRate, tickVolume } from './tick-map';

export type SfxName = 'punch' | 'whoosh' | 'dodge' | 'tick' | 'stop' | 'fanfare' | 'phase';

const AUDIO_BASE = '/game/audio';

let bgm: Howl | null = null;
const sfx: Partial<Record<SfxName, Howl>> = {};
let muted = false;
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const mk = (name: string, volume: number, loop = false) =>
    new Howl({ src: [`${AUDIO_BASE}/${name}.webm`, `${AUDIO_BASE}/${name}.mp3`], volume, loop });
  bgm = mk('bgm', 0.35, true);
  sfx.punch = mk('punch', 0.7);
  sfx.whoosh = mk('whoosh', 0.5);
  sfx.dodge = mk('dodge', 0.5);
  sfx.tick = mk('tick', 0.4);
  sfx.stop = mk('stop', 0.8);
  sfx.fanfare = mk('fanfare', 0.7);
  sfx.phase = mk('phase', 0.6);
  Howler.mute(muted);
}

/** Gọi trong handler nút «Cả nhóm đồng ý — Bắt đầu» để mở khoá audio (gesture). Cũng preload khi vào M1. */
export function unlockAudio(): void {
  ensureLoaded();
  // Howler tự unlock theo gesture qua WebAudio; resume tường minh cho chắc.
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function startBgm(): void {
  ensureLoaded();
  if (bgm && !bgm.playing()) bgm.play();
}

export function stopBgm(): void {
  bgm?.stop();
}

export function playSfx(name: SfxName): void {
  ensureLoaded();
  const h = sfx[name];
  if (h) h.play();
}

export function setGameMuted(next: boolean): void {
  muted = next;
  Howler.mute(next);
}

export function isGameMuted(): boolean {
  return muted;
}

/**
 * Adapter khớp interface GameSound của lane P-STAGE (game/phaser/bridge.ts)
 * — truyền qua prop `sound` của GameStage; scene chỉ gọi các hàm này.
 * Ánh xạ: tick/drum của G2 dùng CÙNG một mẫu âm «tách» (sfx.tick) nhưng
 * khác tham số phát — tick biến thiên theo vận tốc góc hiện tại, drum
 * biến thiên theo thời gian còn lại (tick-map.ts; SPEC §7.5 cho phép vì
 * tham số chỉ là hàm của vận tốc/thời gian, giống nhau cho mọi ô); hit
 * của G1 dùng tiếng đấm (chí mạng phát hai nhịp), miss dùng whoosh,
 * fall dùng tiếng dừng trầm.
 */
export const gameSound: GameSound = {
  tick: (velocity01: number) => {
    ensureLoaded();
    const h = sfx.tick;
    if (!h) return;
    const id = h.play();
    h.rate(tickRate(velocity01), id);
    h.volume(tickVolume(velocity01), id);
  },
  drum: (remaining01: number) => {
    ensureLoaded();
    // Cùng mẫu âm với tick (sfx.tick) — chỉ khác hàm tham số: trống dồn
    // căng/lớn dần khi thời gian còn lại ít đi (drumRate/drumVolume).
    const h = sfx.tick;
    if (!h) return;
    const id = h.play();
    h.rate(drumRate(remaining01), id);
    h.volume(drumVolume(remaining01), id);
  },
  stop: () => playSfx('stop'),
  hit: (crit: boolean) => {
    playSfx('punch');
    if (crit) window.setTimeout(() => playSfx('punch'), 70);
  },
  dodge: () => playSfx('dodge'),
  miss: () => playSfx('whoosh'),
  fall: () => playSfx('stop'),
  phase: () => playSfx('phase'),
  setMuted: (m: boolean) => setGameMuted(m),
};

/** Dừng toàn bộ âm thanh + unload mọi Howl của game (thứ tự §1.2 bước b). */
export function stopAllAudio(): void {
  try {
    Howler.stop();
    bgm?.unload();
    for (const h of Object.values(sfx)) h?.unload();
  } catch {
    // Đã unload một phần — bỏ qua, mục tiêu là không còn âm thanh nào sống sót.
  }
  bgm = null;
  for (const k of Object.keys(sfx) as SfxName[]) delete sfx[k];
  loaded = false;
}
