// gen-audio.mjs — Tự sinh asset âm thanh của game mode bằng sóng cơ bản
// (node thuần, không thư viện): đấm/whoosh/né/tick/dừng/kèn + BGM loop ngắn.
// Chạy: node game/tools/gen-audio.mjs  (sinh WAV vào public/game/audio/,
// sau đó dùng ffmpeg chuyển WebM/Opus + MP3 — xem ASSET-MANIFEST.md).
// Mọi âm thanh đều là hiệu ứng trung tính của game đối kháng/vòng quay;
// CẤM âm thanh xu/máy quay/jackpot (SPEC §7.5/§9).

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public/game/audio',
);
mkdirSync(outDir, { recursive: true });

function wavBuffer(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

const secs = (s) => Math.floor(s * SR);
const sine = (freq, t) => Math.sin(2 * Math.PI * freq * t);
// Noise xác định bằng LCG — file sinh ra giống hệt mỗi lần chạy (không Math.random).
let lcg = 123456789;
const noise = () => {
  lcg = (Math.imul(lcg, 1103515245) + 12345) & 0x7fffffff;
  return (lcg / 0x7fffffff) * 2 - 1;
};

function render(name, durationSec, fn) {
  const n = secs(durationSec);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = fn(i / SR, i);
  writeFileSync(path.join(outDir, `${name}.wav`), wavBuffer(samples));
  console.log(`${name}.wav: ${n} samples`);
}

// Đấm «bốp»: tiếng trầm ngắn (sine 90Hz decay nhanh) + nhiễu đầu đòn.
render('punch', 0.18, (t) => {
  const env = Math.exp(-t * 28);
  return (sine(90, t) * 0.8 + noise() * 0.25 * Math.exp(-t * 60)) * env;
});
// Whoosh: nhiễu quét qua, envelope hình chuông.
render(
  'whoosh',
  0.25,
  (t) =>
    noise() *
    Math.sin(Math.PI * (t / 0.25)) *
    0.5 *
    (0.4 + 0.6 * Math.sin(2 * Math.PI * 3 * t) ** 2),
);
// Né: sine quét lên 500→900Hz.
render('dodge', 0.22, (t) => sine(500 + 1800 * t, t) * Math.exp(-t * 6) * 0.45);
// Tick: click rất ngắn khi mâm qua biên ô (thuần hàm của vận tốc — một âm duy nhất cho mọi ô).
render('tick', 0.05, (t) => sine(1800, t) * Math.exp(-t * 120) * 0.5);
// Dừng: tiếng «cạch» trầm dứt khoát khi mâm dừng / kết quả chốt.
render('stop', 0.3, (t) => (sine(140, t) * 0.7 + sine(70, t) * 0.4) * Math.exp(-t * 14));
// Kèn kết quả ở M7: hợp âm đi lên C–E–G–C (sine + harmonic nhẹ) — kèn tuyên bố kết quả trung tính, KHÔNG phải nhạc kiểu máy quay thưởng.
render('fanfare', 1.1, (t) => {
  const notes = [261.63, 329.63, 392.0, 523.25];
  const idx = Math.min(notes.length - 1, Math.floor(t / 0.22));
  const local = t - idx * 0.22;
  const f = notes[idx];
  return (sine(f, t) * 0.5 + sine(f * 2, t) * 0.15) * Math.exp(-local * 3.2) * 0.8;
});
// Pha/đột tử: hai tiếng trống ngắn.
render('phase', 0.5, (t) => {
  const hit = t < 0.2 ? Math.exp(-t * 16) : Math.exp(-(t - 0.25) * 16);
  return sine(110, t) * 0.7 * hit;
});
// BGM 32 giây liền mạch (đợt PRES 2026-10-25): 4 vòng biến tấu trên cùng vòng
// hợp âm Am–F–C–G (mỗi hợp âm 2s, một vòng 8s) để loop dài không lộ vòng lặp:
//   Vòng 1 (0–8s):   pad hợp âm sine mềm + nhịp trống trầm nhẹ mỗi 0.5s (như bản 8s cũ).
//   Vòng 2 (8–16s):  + giai điệu pluck thang ngũ âm A minor (pattern cứng MEL2)
//                    + tick noise rất nhẹ ở phách lẻ.
//   Vòng 3 (16–24s): + arpeggio nốt hợp âm quãng 8 (8 nốt/giây, gain thấp)
//                    + giai điệu biến tấu (MEL3) + bass thỉnh thoảng nhảy quãng 8.
//   Vòng 4 (24–32s): giữ giai điệu (MEL4 thưa) + arpeggio nhưng giảm mật độ/gain
//                    về gần vòng 1 để nối vòng lặp êm.
// KHÔNG fade hai đầu kiểu cũ: dùng loop-blend — cộng chồng 0.4s cuối với 0.4s đầu
// theo ramp tuyến tính (tail' = tail×(1−r) + head×r) để điểm 32s→0s liên tục.
// Xác định hoàn toàn: reset LCG về hằng số ngay trước khi render BGM; pattern
// nốt viết cứng; không Math.random/Date — chạy lại cho WAV giống hệt từng byte.
lcg = 20261025;
{
  const BGM_LEN = 32;
  const BLEND_SEC = 0.4;
  const n = secs(BGM_LEN);
  const samples = new Float32Array(n);
  const chords = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [130.81, 164.81, 196.0], // C
    [196.0, 246.94, 293.66], // G
  ];
  // Thang ngũ âm A minor: A4 C5 D5 E5 G5 A5.
  const penta = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
  // Pattern giai điệu: 16 ô × 0.5s trong một vòng 8s; -1 = nghỉ, còn lại là chỉ số penta.
  const MEL2 = [0, -1, 2, -1, 3, -1, 2, 1, 0, -1, 1, -1, 2, -1, 4, 3];
  const MEL3 = [4, -1, 3, 2, -1, 3, -1, 1, 2, -1, 4, -1, 3, 2, 1, -1];
  const MEL4 = [0, -1, -1, 2, -1, -1, 3, -1, 2, -1, -1, 1, -1, -1, -1, -1];
  // Vòng 3: các ô 0.5s mà bass nhảy lên quãng 8 (thay vì nốt gốc/2).
  const BASS_JUMP = new Set([4, 11]);
  const pluck = (pattern, step, local, t, gain) => {
    const note = pattern[step];
    return note < 0 ? 0 : sine(penta[note], t) * gain * Math.exp(-local * 7);
  };
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const loopIdx = Math.floor(t / 8); // 0..3 — vòng biến tấu
    const loopT = t % 8;
    const chord = chords[Math.floor(t / 2) % 4];
    // Nền chung mọi vòng: pad hợp âm + trống trầm nhẹ mỗi 0.5s.
    let v = 0;
    for (const f of chord) v += sine(f, t) * 0.12 + sine(f * 2, t) * 0.03;
    const beat = t % 0.5;
    v += sine(100, t) * 0.12 * Math.exp(-beat * 18);
    const step = Math.floor(loopT / 0.5); // ô 0.5s trong vòng (0..15)
    const stepLocal = loopT - step * 0.5;
    if (loopIdx === 1) {
      // Vòng 2: pluck MEL2 + tick noise rất nhẹ ở phách lẻ.
      v += pluck(MEL2, step, stepLocal, t, 0.13);
      if (step % 2 === 1 && stepLocal < 0.03) {
        v += noise() * 0.035 * Math.exp(-stepLocal * 80);
      }
    } else if (loopIdx === 2) {
      // Vòng 3: pluck biến tấu MEL3 + arpeggio 8 nốt/giây + bass nhảy quãng 8.
      v += pluck(MEL3, step, stepLocal, t, 0.13);
      const arpStep = Math.floor(loopT / 0.125);
      const arpLocal = loopT - arpStep * 0.125;
      v += sine(chord[arpStep % 3] * 2, t) * 0.045 * Math.exp(-arpLocal * 10);
      const bassF = BASS_JUMP.has(step) ? chord[0] : chord[0] / 2;
      v += sine(bassF, t) * 0.08 * (0.6 + 0.4 * Math.exp(-stepLocal * 3));
    } else if (loopIdx === 3) {
      // Vòng 4: giai điệu thưa MEL4 (gain thấp) + arpeggio thưa 4 nốt/giây, gain thấp.
      v += pluck(MEL4, step, stepLocal, t, 0.09);
      const arpStep = Math.floor(loopT / 0.25);
      const arpLocal = loopT - arpStep * 0.25;
      v += sine(chord[arpStep % 3] * 2, t) * 0.028 * Math.exp(-arpLocal * 10);
    }
    samples[i] = v;
  }
  // Loop-blend 0.4s: đuôi được trộn dần về đầu để điểm nối 32s→0s liên tục.
  const blendN = secs(BLEND_SEC);
  for (let i = 0; i < blendN; i++) {
    const r = i / blendN;
    const tailIdx = n - blendN + i;
    samples[tailIdx] = samples[tailIdx] * (1 - r) + samples[i] * r;
  }
  writeFileSync(path.join(outDir, 'bgm.wav'), wavBuffer(samples));
  console.log(`bgm.wav: ${n} samples`);
}
