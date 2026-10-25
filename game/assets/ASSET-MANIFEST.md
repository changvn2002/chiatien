# ASSET-MANIFEST — Asset của game mode «Ai Đãi»

> Mỗi asset một dòng: tên file · nguồn · license · ngày lấy · biến đổi · kích thước cuối.
> Đường tĩnh: `public/game/audio/` (SW họ game cache-first theo ARCHITECTURE §7).
>
> **QUYẾT ĐỊNH USER 2026-10-25 ~07:08 («miễn phí, e tự code nhá»):** KHÔNG mua asset trả phí nào.
> Asset ngoài chỉ từ nguồn free-license đã kiểm chứng ở research/02 (Kenney CC0; pack itch.io miễn
> phí cho dùng thương mại; LPC chỉ lớp CC0/CC-BY kèm CREDITS; GameArt2D freebies CC0); phần còn lại
> TỰ CODE — asset tự code là đường chính thức, không phải placeholder chờ thay. Kiểm chứng đợt
> prototype: grep `craftpix` trên `game/` + `public/game/` = 0 kết quả — build không chứa asset trả phí nào.

## Audio — TỰ SINH BẰNG CODE (đường «tự code» theo quyết định user 2026-10-25)

Đã thử tải Kenney CC0 từ kenney.nl ngày 2026-10-25: máy chủ trả về trang JavaScript thay vì file zip (không tải được trong time-box ngắn) → tự sinh toàn bộ bằng script `game/tools/gen-audio.mjs` (node thuần: sóng sin/noise có envelope, noise bằng LCG xác định — sinh lại cho file giống hệt), rồi ffmpeg 8.1.2 chuyển WAV → WebM/Opus (48k) + MP3 (96k). Theo quyết định user 2026-10-25, bộ âm tự sinh này là **asset tự code chính thức** (không phải placeholder chờ thay); Kenney CC0 vẫn là nguồn free hợp lệ để bổ sung sau nếu tải được. CẤM âm thanh xu/máy quay/jackpot — không có âm nào thuộc loại đó trong bộ này.

| File | Nguồn | License | Ngày | Biến đổi | Kích thước cuối |
|---|---|---|---|---|---|
| public/game/audio/bgm.webm + bgm.mp3 | Tự sinh — game/tools/gen-audio.mjs (BGM 32 giây, đợt PRES 2026-10-25: 4 vòng biến tấu trên vòng hợp âm Am–F–C–G — V1 pad sine mềm + trống nhẹ; V2 + pluck ngũ âm A minor (pattern cứng) + tick noise phách lẻ; V3 + arpeggio quãng 8 8 nốt/giây + pluck biến tấu + bass nhảy quãng 8; V4 giảm mật độ/gain về gần V1; loop-blend 0,4s cuối↔đầu, bỏ fade hai đầu) | Dự án tự sinh (MIT của repo) | 2026-10-25 | WAV → Opus 48k / MP3 96k bằng ffmpeg | 273.883 B / 384.985 B |
| public/game/audio/punch.webm + punch.mp3 | Tự sinh — tiếng đấm «bốp» (sine 90Hz + nhiễu, decay) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 1.546 B / 3.179 B |
| public/game/audio/whoosh.webm + whoosh.mp3 | Tự sinh — tiếng đòn trượt/hụt | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 2.150 B / 4.120 B |
| public/game/audio/dodge.webm + dodge.mp3 | Tự sinh — tiếng né đòn (sine quét lên) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 2.262 B / 3.806 B |
| public/game/audio/tick.webm + tick.mp3 | Tự sinh — tiếng «tách» qua biên ô (một âm duy nhất cho mọi ô, SPEC §7.5) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 819 B / 1.612 B |
| public/game/audio/stop.webm + stop.mp3 | Tự sinh — tiếng dừng dứt khoát (mâm dừng / nhân vật ngã) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 2.573 B / 4.747 B |
| public/game/audio/fanfare.webm + fanfare.mp3 | Tự sinh — kèn kết quả ở M7 (hợp âm đi lên, không phải nhạc máy quay) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 8.593 B / 14.464 B |
| public/game/audio/phase.webm + phase.mp3 | Tự sinh — hai tiếng trống tuyên bố giai đoạn (đột tử/ván phụ) | Dự án tự sinh | 2026-10-25 | WAV → Opus/MP3 | 3.789 B / 7.254 B |

Tổng audio: WebM/Opus (thực tải của một user hiện đại) = **295.615 B**; MP3 = 424.167 B; ship cả hai định dạng = **719.782 B** — dưới trần dòng C của ARCHITECTURE §4 ((ii) ~600.000 B/user; (i) ~1.500.000 B ship). Số đo cập nhật đợt PRES 2026-10-25 (BGM 8s → 32s): `du -b` trên file ship thật trong `public/game/audio/`; coordinator chốt lại khi verify.

## Texture/atlas — TỰ CODE TOÀN BỘ (0 file ảnh tĩnh) [trạng thái PROTO/PRES — nhân vật G1 đã thay bằng atlas CC0 ở đợt REBUILD-C, xem mục "Atlas sprite G1" bên dưới; các bề mặt còn lại giữ nguyên]

Không ship atlas/ảnh tĩnh nào: mọi bề mặt hình đều sinh bằng code lúc chạy → chuyển mạng dòng B = **0 B** (coordinator đo, PROTO-E-VERIFY §2). Từng bề mặt:

| Bề mặt | Nguồn | License | Cách sinh |
|---|---|---|---|
| Mâm G2 (mâm tròn, vòng ghế, kim = đôi đũa) | Tự code — `game/phaser/scenes-g2.ts` + `textures.ts` | Dự án tự code | Phaser Graphics/vector trong hệ thiết kế của app; cấm yếu tố roulette/casino (SPEC §7.1) |
| Nhân vật G1 (thân theo màu áo, đầu, hiệu ứng đòn) | Tự code — `game/phaser/scenes-g1.ts` + `textures.ts` | Dự án tự code | Hình thủ tục bằng canvas/Graphics; bản tự code đầu tiên (xem ghi chú giới hạn ở PROTO-STATE) |
| Nameplate + thanh HP | Tự code — `game/phaser/` | Dự án tự code | Graphics + text Phaser |
| Badge initials trên nameplate | Sinh tại client bằng thư viện DiceBear (xem bảng thư viện dưới) | MIT (DiceBear) | SVG data-URL → texture canvas; seed = tên người chơi; KHÔNG gọi HTTP API DiceBear |

## Atlas món G2 «Mâm Cơm Xoay» — Kenney Food Kit (CC0) — THÊM 2026-10-25 (REBUILD-C lane C)

Đường asset thật đầu tiên của game (thay món vector tự vẽ ở G2; mục «Texture/atlas — TỰ CODE TOÀN BỘ» ở trên chỉ còn đúng cho các bề mặt còn lại, riêng G2 dùng mục này):

- **Nguồn + license (verify từ nguồn chính chủ):** Kenney Food Kit 2.0 — trang chính chủ https://kenney.nl/assets/food-kit ghi nguyên văn dòng license: `License | Creative Commons CC0`. File `License.txt` trong zip tải từ chính kenney.nl (đường tải nhúng trong HTML trang chính chủ: `https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip`, 4.606.270 B, tải ngày 2026-10-25) ghi: `License: (Creative Commons Zero, CC0)` / `You can use this content for personal, educational, and commercial purposes.` / `Support by crediting 'Kenney' or 'www.kenney.nl' (this is not a requirement)`.
- **Model đã dùng (8):** `bowl-broth`, `bowl-soup`, `salad`, `plate-dinner`, `plate-sauerkraut`, `pot-stew` (đợt REBUILD-C lane C) + **`turkey`** (gà quay nguyên con) và **`corn`** (bắp) — thêm đợt FIX-V3 lane A2 2026-10-25 để chống trùng món trên mâm 12 ghế, chọn bằng mắt từ vòng render kiểm 8 ứng viên (loại maki-* vì hộp lục giác, watermelon vì khối quá lấn, skewer vì quá mảnh, fish vì đọc yếu từ trên xuống; `meat-ribs` đạt mắt nhưng không vừa trần — GLB giữ ở `models/` chờ quyết định nới trần). Zip tải lại từ đúng URL kenney.nl chính chủ ở trên, dung lượng 4.606.270 B khớp hệt bản lane C, `License.txt` trong zip ghi CC0 nguyên văn (đã đối chiếu lại đợt này).
- **Biến đổi:** render trước thành sprite bằng Three.js headless (pipeline `game/tools/render-food/`, góc máy 58°, bóng nướng sẵn, nền trong suốt) → sheet **4×2** ô 128px → WebP quality **86** (PIL; hạ từ 88 đợt FIX-V3 để vừa trần khi sheet lên 8 món — đối chiếu frame q88/q86 không khác biệt nhìn thấy, xem handoff A2). Chạy lại: `node game/tools/render-food/render-food.mjs` (ghi đè danh sách bằng `--items=a,b,c` khi cần).
- **File ship:** `public/game/atlas/g2-food.webp` = **26.128 B** (md5 `76169ad2462a14c908250fed2b07d94a`, bản 6 món cũ là 20.226 B/md5 `18659bea…`) + `public/game/atlas/g2-food.json` = **2.390 B** (Phaser JSON hash, 8 frame) → tổng atlas G2 = **28.518 B**, tính chung trần dòng B 400.000 B với atlas G1.
- **Runtime:** `G2Scene.preload()` nạp atlas; atlas tải lỗi → tự rơi về món vector PRES vòng 2 (fallback trong `scenes-g2.ts`), không bao giờ mâm trống món.

## Atlas sprite G1 — KayKit Adventurers (CC0), render trước hướng C (đợt REBUILD-C, lane A, 2026-10-25)

Nguồn: **KayKit — Character Pack: Adventurers 1.0** của Kay Lousberg, repo chính chủ
https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 — License **CC0 1.0**
(đọc trực tiếp `LICENSE.txt` của repo: "License: (Creative Commons Zero, CC0)"; bản sao license +
`Rogue_Hooded.glb` tải thêm giữ ở `chiatien-game-v2/scratch-a/`). 4 GLB đầu lấy từ
`chiatien-game-v2/visual-demos/b-3d-realtime/assets/`; model thứ 5 `Rogue_Hooded.glb` tải raw từ
chính repo trên (pack có đúng 5 character GLB — đã liệt kê toàn cây repo). Mọi model có **76 clip**
(danh sách đầy đủ trong handoff `chiatien-game-v2/REBUILD-C-A-ASSETS.md`).

Pipeline: `game/tools/run-pipeline.mjs` (Three.js 0.180 headless qua CDP + forward proxy hostname
ảo, trích PNG qua `canvas.toDataURL` giữ alpha) → `game/tools/convert-atlas.py` (PIL/libwebp
method=6, quality=75, alpha_quality=100). Thông số render: camera profile ngang, mặt hướng PHẢI,
cao chuẩn hoá 1,8, bóng đổ nướng bằng ShadowMaterial, nền trong suốt, ẩn node vũ khí/khiên theo
regex tên node (đánh tay không). Ô **192×192**, **4 frame/hành động × 9 hành động = 36 frame/model**,
sheet 768×1728. Hành động → clip: idle→`Idle` (0–92%), punchA→`Unarmed_Melee_Attack_Punch_A`,
punchB→`Unarmed_Melee_Attack_Punch_B`, kick→`Unarmed_Melee_Attack_Kick`, hitA→`Hit_A`, hitB→`Hit_B`,
dodge→`Dodge_Backward` (chuẩn hoá bbox), fall→`Death_A` (đoạn 4–97%, chuẩn hoá bbox qua
`applyBoneTransform`), victory→`Cheer`. JSON cạnh mỗi WebP là atlas Phaser 3 dạng hash,
key frame `<action>_<idx>`.

| File | Model GLB | License | Kích thước WebP |
|---|---|---|---|
| public/game/atlas/g1-knight.webp (+ .json) | Knight.glb (3.659.532 B) | CC0 1.0 | 73.970 B |
| public/game/atlas/g1-barbarian.webp (+ .json) | Barbarian.glb (3.613.268 B) | CC0 1.0 | 78.980 B |
| public/game/atlas/g1-mage.webp (+ .json) | Mage.glb (3.589.240 B) | CC0 1.0 | 71.618 B |
| public/game/atlas/g1-rogue.webp (+ .json) | Rogue.glb (3.616.284 B) | CC0 1.0 | 67.554 B |
| public/game/atlas/g1-roguehooded.webp (+ .json) | Rogue_Hooded.glb (3.597.652 B) | CC0 1.0 | 67.422 B |

**Tổng G1 = 359.544 B.** Cộng atlas G2 của lane C (`g2-food.webp` 20.226 B, cùng thư mục):
**tổng mọi atlas game = 379.770 B ≤ trần dòng B 400.000 B** (`du -cb` trên đĩa, 2026-10-25).
⚠️ Số tổng này đã được thay bằng đợt FIX-V3 (thêm bề mặt sân/mâm + atlas G2 lên 8 món) —
tổng dòng B hiện tại xem mục «Bề mặt sân G1 / mặt mâm G2» ngay dưới.
Biến thể màu người chơi: TINT tại runtime (không pre-render) — bằng chứng + số byte hai phương án
ở handoff lane A §5.

## Bề mặt sân G1 / mặt mâm G2 — TỰ CODE bằng PIL (đợt FIX-V3, lane A2, 2026-10-25)

Hai texture đĩa tròn nền TRONG SUỐT (alpha) để lane B/C phủ lên đĩa Graphics hiện có,
thay đĩa xám phẳng bị panel v3 kết án «vô vật liệu» và «một đĩa dùng chung hai game».
Nguồn: **dự án tự sinh 100% bằng code** (đường «tự code» theo quyết định user 2026-10-25,
không asset ngoài, không license bên thứ ba) — generator `game/tools/gen-surfaces.py`
(PIL, seed cố định → chạy lại ra file giống hệt). Chạy lại:
`python3 game/tools/gen-surfaces.py public/game/atlas`.

| File | Nội dung | Kích thước |
|---|---|---|
| public/game/atlas/g1-floor.webp | Đĩa sàn gỗ 512×512: ván ngang gỗ sáng ấm trung tính theo demo B (mặt ~#D9C096, vành nâu đậm #6D5136), vân gỗ cong mềm + mắt gỗ thưa, vignette sáng tâm/tối mép. md5 `1f1704f7e7f81a8dc1dee5d1be9aef36` | **5.222 B** |
| public/game/atlas/g2-tray.webp | Mặt mâm gốm 512×512: vành men ấm (vòng men sáng + 1 chỉ đất nung trầm), lòng mâm lõm có chiều sâu (radial tối dần vào tâm), loang men mềm, vệt sáng men trên-trái — khác hẳn sàn gỗ G1, vẫn gam trung tính. md5 `406ef7572acab1371c23634b556c5970` | **5.080 B** |

Ghi chú kỹ thuật nén (đã đo): vẽ trực tiếp ở cỡ đích, KHÔNG supersample — supersample 2× +
Lanczos làm WebP phình ~2 lần vì tông trung gian trên mọi cạnh (sàn 512 q65: 6.638 B trực
tiếp so với 12.416 B supersample); lớp vòng vành riêng của sàn được vẽ 2× rồi hạ cỡ vì mắt
nhạy răng cưa nhất ở vòng tròn. WebP quality 60, method 6, alpha_quality 100.
**Tổng dòng B sau đợt FIX-V3 (cách đếm của coordinator: WebP raw + JSON gzip):**
WebP raw 395.974 B (5 atlas G1 359.544 + g2-food 26.128 + g1-floor 5.222 + g2-tray 5.080)
+ JSON gzip 2.767 B = **398.741 B / 400.000 B — ĐẠT, dư 1.259 B** (đo trên đĩa 2026-10-25).
Chưa ship (không vừa trần, chờ coordinator/parent quyết — số đo thật ở handoff
`chiatien-game-v2/REBUILD-C2-A2-ASSETS.md`): ảnh thẻ M4 ×2, món thứ 9 `meat-ribs`,
khăn bàn G2 `g2-cloth` (bản ứng viên trong scratch-a2, 8.894 B).

## Thư viện chạy trong game chunk (license kiểm từ package.json trong node_modules, 2026-10-25)

| Thư viện | Version | License | Vai trò |
|---|---|---|---|
| phaser | 3.90.0 | MIT | Engine trình diễn (không quyết kết quả) |
| howler | 2.2.4 | MIT | Phát audio |
| jsqr | 1.4.0 | Apache-2.0 | Giải mã QR từ ảnh (OPEN-P5 — xem proto-measure/QR-MEASURE.md) |
| @dicebear/core | 9.4.3 | MIT | Sinh avatar initials tại client |
| @dicebear/collection | 9.4.3 | MIT | Style `initials` cho DiceBear |

Không thư viện/asset trả phí nào khác được dùng. Asset ngoài (Kenney CC0, pack itch.io free-thương-mại, LPC CC0/CC-BY + CREDITS, GameArt2D CC0) hiện **chưa dùng cái nào** — khi dùng phải thêm dòng vào manifest này TRƯỚC khi ship.

## Bảng màu áo (game/assets/palette.ts)

12 màu Material bậc 600–800 ghi mã hex đầy đủ tại `game/assets/palette.ts`: #D32F2F, #C2185B, #7B1FA2, #512DA8, #303F9F, #1976D2, #0097A7, #00796B, #388E3C, #AFB42B, #F9A825, #EF6C00.

## Bộ nhân vật theo set + tải lười — THÊM 2026-10-25 (FIX-V3 lane A3)

Atlas G1 cũ ở trên GIỮ NGUYÊN (không ghi đè). Thêm 3 bộ nhân vật mới dưới
`public/game/atlas/sets/<setId>/`, mỗi bộ 12 nhân vật, tải lười theo bộ đã chọn.
Manifest máy đọc: `public/game/atlas/sets/SETS-MANIFEST.json` (byte từng file,
clip thật, bảng biến thể). Hồ sơ đầy đủ: `chiatien-game-v2/REBUILD-C2-A3-SETS.md`.
Pipeline: `game/tools/render-set.mjs` + `render-set.html` + `build-sets.py`
(render Three.js headless như pipeline cũ; ô/hành động/frame xem handoff).

| Bộ (setId) | Nguồn + license (verify chính chủ) | Ô / frame | Tổng bộ (WebP + JSON gz + anchors gz) |
|---|---|---|---|
| `adventurers` — «Phiêu Lưu» | KayKit Adventurers 1.0 (Kay Lousberg), repo GitHub chính chủ KayKit-Game-Assets — CC0 1.0 (LICENSE.txt đọc trực tiếp) | 96px · 37 frame (10 hành động, có `run` = Running_A) | 318.854 B |
| `skeletons` — «Xương Khô» | KayKit Skeletons 1.0, repo GitHub chính chủ KayKit-Game-Assets — CC0 1.0 (LICENSE.txt trong repo, đọc 2026-10-25) | 96px · 37 frame (95 clip/model, đủ clip lõi) | 345.202 B |
| `blocky` — «Bạn Khối» | Kenney Blocky Characters 2.0, kenney.nl chính chủ — CC0 (License.txt trong zip chính chủ, đọc 2026-10-25) | 128px · 37 frame (27 clip/model; THIẾU hit/dodge thật — clip thay thế ghi trong manifest/handoff) — **render lại đợt FIX-V4.1 (lane A5): góc 3/4 yaw −35° thay profile cũ, WebP q45 (xem mục riêng dưới)** | **383.361 B** (bản profile cũ: 328.979 B) |

Mỗi bộ kèm `anchors.json` (neo đầu per-frame cho thử nghiệm N3). Ngân sách:
một ván G1 thực tải = bộ đã chọn + `g1-floor.webp` (5.222 B) → 324.076 /
350.424 / **388.583** B (blocky đã cập nhật đợt FIX-V4.1, xem dưới) — đều
≤ 400.000 B theo cách tính mới N2c (chờ parent duyệt);
tổng lưu trữ cả 3 bộ trên đĩa = 1.431.713 B (cách tính cũ — xem handoff §ngân sách;
số này chưa cộng delta +54.382 B của atlas blocky mới).

## Sheet xem trước nhân vật (preview) — THÊM 2026-10-25 (FIX-V4 lane A4)

Mỗi bộ một sheet xem trước ở `public/game/atlas/sets/<setId>-preview.webp` —
lưới 4 cột × 3 hàng, ô 192×192 (sheet 768×576), thứ tự nhân vật đúng thứ tự
`characters` trong SETS-MANIFEST.json (manifest mỗi bộ có trường
`preview: {webp, cell: 192, cols: 4}`). Nguồn: cùng model CC0 của từng bộ ở
trên (KayKit Adventurers/Skeletons, Kenney Blocky — license như mục bộ nhân
vật), render RIÊNG một frame idle ở góc 3/4 hướng mặt về camera (yaw −35°;
pipeline mới `game/tools/render-preview.html` + `render-preview.mjs`, ghép
sheet bằng `game/tools/build-previews.py`) — KHÔNG dùng frame profile của
atlas hành động (preview cũ crop từ atlas làm nhân vật không mặt, Bạn Khối
thành lát dọc). Chuẩn hoá khi ghép: nhân vật cao 154px (80,2% ô), chân ở
y = 169px (88,0% ô), căn giữa ô, nền trong suốt, không bóng đổ. WebP q80,
method 6, alpha_quality 100.

| File | Kích thước |
|---|---|
| public/game/atlas/sets/adventurers-preview.webp | 52.534 B |
| public/game/atlas/sets/skeletons-preview.webp | 58.448 B |
| public/game/atlas/sets/blocky-preview.webp | 29.836 B |
| **Tổng 3 sheet preview** | **140.818 B** |

Ngân sách: 3 sheet này tải TRƯỚC khi chọn bộ → tính vào dòng D (tải lần mở
đầu). Dòng D sau khi cộng preview = A 414.894 + B ván nặng nhất (skeletons
350.424) + C(ii) 295.615 + preview 140.818 = **1.201.751 B ≤ 1.500.000 B**
(dư 298.249 B — đo trên file ship thật 2026-10-25, handoff
`chiatien-game-v2/REBUILD-C3-A4-PREVIEWS.md`).

## Atlas Bạn Khối render lại ở góc 3/4 — THÊM 2026-10-25 (FIX-V4.1 lane A5)

Bản atlas blocky cũ render ở góc profile (`rotation.y = π/2`) làm trục vai
trùng hướng camera → nhân vật sụp thành lát cắt dọc mỏng trong trận (bề rộng
thân frame idle chỉ **28px / ô 128px**, đo alpha > 128 để loại bóng đổ), dù
sheet preview của lane A4 đã đúng. Đợt này render lại TOÀN BỘ atlas blocky
bằng chính pipeline atlas (`render-set.mjs`/`render-set.html` +
`build-sets.py`, thêm tham số `YAW_DEG`/`?yawDeg=`) ở **yaw −35° tuyệt đối**
— đúng thông số A4 dùng cho preview (hệ quy chiếu render-preview.html:
yaw 0° = chính diện, mặt +Z hướng về camera 3/4; lệch −125° so với trục
profile cũ π/2). Giữ nguyên contract: 12 nhân vật, 10 hành động / 37 frame
(idle 3, run 4, punchA 5, punchB 4, kick 5, hitA 3, hitB 3, dodge 3,
fall 4, victory 3), ô 128px, WebP + JSON Phaser + `anchors.json` đo lại từ
bản render mới bằng cùng hàm neo đầu của pipeline. Hai bộ kia không đụng;
SETS-MANIFEST.json chỉ thay entry blocky (theme + preview giữ nguyên).

Chạy lại: `ONLY_SET=blocky YAW_DEG=-35 node game/tools/render-set.mjs` rồi
`ONLY_SET=blocky python3 game/tools/build-sets.py 45`.

| Số đo (file ship) | Cũ (profile, q70) | Mới (yaw −35°) |
|---|---|---|
| Bề rộng thân idle (alpha > 128, TB 36 frame) | 28,0px (21,9% ô) | **52,0px (40,6% ô)** |
| WebP 12 nhân vật | 322.340 B (q70) | 455.448 B ở q70 → **376.712 B ở q45 (bản ship)** |
| JSON gzip + anchors gzip | 5.942 + 697 B | 5.942 + 707 B |
| Tổng bộ | 328.979 B | **383.361 B** |
| Dòng B N2c (bộ + `g1-floor.webp` 5.222 B) | 334.201 B | **388.583 B ≤ 400.000 B** (dư 11.417 B) |

Hạ chất lượng là bắt buộc để vừa trần: ở q70 bản 3/4 vượt trần +67.319 B
(q60 +34.229, q55 +18.107, q50 +4.135 — đều vượt; q45 là mức cao nhất đã
đo còn vừa). Đối chiếu mắt phóng 2× q70/q45/q40 trên cùng frame: gần như
không phân biệt được (bề mặt phẳng ít chi tiết tần số cao; alpha_quality
giữ 100). Chi tiết + ảnh kiểm + trạng thái quirk `fall_3` (vẫn quay về tư
thế đứng — giữ nguyên như cũ): handoff
`chiatien-game-v2/REBUILD-C3-A5-BLOCKY.md`.
