#!/usr/bin/env python3
"""build-previews.py — lane A4 (FIX-V4): ghép frame idle 3/4 thô (render-preview)
thành sheet xem trước <setId>-preview.webp cho cả 3 bộ + cập nhật SETS-MANIFEST.

Contract (REBUILD-C3-STATE, coordinator chốt cứng):
  - Mỗi bộ 1 sheet: lưới 4 cột × 3 hàng, ô 192×192 → sheet 768×576.
  - Thứ tự nhân vật = đúng thứ tự `characters` trong SETS-MANIFEST.json hiện hành
    (script ĐỌC manifest để lấy thứ tự, không tự sắp xếp lại).
  - Nhân vật chiếm ~80% chiều cao ô, chân ở ~88% chiều cao ô, nền trong suốt:
    script đo bbox alpha của frame thô, cắt, scale cho chiều cao = 154px
    (80,2% × 192), dán căn giữa ngang, đáy bbox (chân) ở y = 169 (88,0% × 192).
    Nếu chiều ngang sau scale > 186px thì scale tiếp theo chiều ngang.
  - WebP quality theo tham số (mặc định 80), method 6, giữ alpha (alpha_quality 100).
  - Manifest: mỗi bộ thêm preview {webp, cell: 192, cols: 4} và theme = copy
    người dùng đã chốt ở REBUILD-C3-STATE (đồng bộ với SET_INFO ở build-sets.py).

Dùng: python3 game/tools/build-previews.py [quality] [cell]
Đọc  ~/workspace/mini-apps/chiatien-game-v2/scratch-a4/raw-previews/<setId>/<key>.png
Ghi  public/game/atlas/sets/<setId>-preview.webp + cập nhật SETS-MANIFEST.json
"""
import json
import os
import sys

from PIL import Image

HOME = os.path.expanduser("~")
RAW = f"{HOME}/workspace/mini-apps/chiatien-game-v2/scratch-a4/raw-previews"
OUT = f"{HOME}/workspace/mini-apps/chiatien/public/game/atlas/sets"
QUALITY = int(sys.argv[1]) if len(sys.argv) > 1 else 80
CELL = int(sys.argv[2]) if len(sys.argv) > 2 else 192
COLS = 4
ROWS = 3
TARGET_H = round(CELL * 0.802)   # 154 @192 — ~80% chiều cao ô
FEET_Y = round(CELL * 0.88)      # 169 @192 — chân ở ~88% chiều cao ô
MAX_W = CELL - 6

# Copy người dùng — coordinator chốt ở REBUILD-C3-STATE.md, đồng bộ build-sets.py.
THEMES = {
    "adventurers": "Hiệp sĩ, chiến binh, pháp sư và thích khách dũng cảm",
    "skeletons": "Bộ xương ngộ nghĩnh — hù nhau cho vui",
    "blocky": "Người khối vuông, mỗi bạn một bộ đồ riêng",
}


def place(sheet: Image.Image, raw_path: str, idx: int) -> tuple[int, int]:
    im = Image.open(raw_path).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"frame rong (khong alpha): {raw_path}")
    crop = im.crop(bbox)
    scale = TARGET_H / crop.height
    if crop.width * scale > MAX_W:
        scale = MAX_W / crop.width
    nw = max(1, round(crop.width * scale))
    nh = max(1, round(crop.height * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    cx = (idx % COLS) * CELL
    cy = (idx // COLS) * CELL
    x = cx + (CELL - nw) // 2
    y = cy + FEET_Y - nh
    sheet.alpha_composite(crop, (x, y))
    return nw, nh


def main() -> None:
    manifest_path = os.path.join(OUT, "SETS-MANIFEST.json")
    manifest = json.load(open(manifest_path))
    total = 0
    for entry in manifest["sets"]:
        set_id = entry["setId"]
        keys = [c["modelKey"] for c in entry["characters"]]
        if len(keys) != COLS * ROWS:
            raise SystemExit(f"{set_id}: {len(keys)} nhan vat, can {COLS * ROWS}")
        sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
        for i, key in enumerate(keys):
            raw_path = os.path.join(RAW, set_id, key + ".png")
            if not os.path.isfile(raw_path):
                raise SystemExit(f"thieu frame tho: {raw_path}")
            w, h = place(sheet, raw_path, i)
            print(f"  {set_id}/{key}: dat {w}x{h}px vao o {i}")
        out_path = os.path.join(OUT, f"{set_id}-preview.webp")
        sheet.save(out_path, "WEBP", quality=QUALITY, method=6, alpha_quality=100)
        size = os.path.getsize(out_path)
        total += size
        entry["theme"] = THEMES[set_id]
        entry["preview"] = {"webp": f"sets/{set_id}-preview.webp", "cell": CELL, "cols": COLS}
        print(f"{set_id}: sheet {sheet.width}x{sheet.height} q{QUALITY} cell {CELL} = {size} B")
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f"TONG 3 sheet preview: {total} B; SETS-MANIFEST.json da cap nhat (preview + theme)")


if __name__ == "__main__":
    main()
