#!/usr/bin/env python3
"""convert-atlas.py — nén sprite sheet PNG thô thành WebP + JSON atlas Phaser 3.

Dùng: python3 convert-atlas.py <raw_dir> <out_dir> <cell> <frames> <webp_quality>
Đọc <raw_dir>/<Model>.png + <Model>.meta.json (do run-pipeline.mjs sinh),
ghi <out_dir>/g1-<slug>.webp + g1-<slug>.json (frames dạng object, key
`<action>_<idx>` — hợp đồng REBUILD-C-STATE). In dung lượng từng file + tổng
để đối chiếu cổng B = 400.000 byte. Nén bằng PIL (libwebp) method=6.
"""
import json
import os
import sys

from PIL import Image

SLUG = {
    "Knight": "knight",
    "Barbarian": "barbarian",
    "Mage": "mage",
    "Rogue": "rogue",
    "RogueHooded": "roguehooded",
}


def main() -> None:
    raw_dir, out_dir = sys.argv[1], sys.argv[2]
    cell, frames, quality = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for model, slug in SLUG.items():
        png = os.path.join(raw_dir, model + ".png")
        if not os.path.exists(png):
            continue
        meta = json.load(open(os.path.join(raw_dir, model + ".meta.json")))
        im = Image.open(png).convert("RGBA")
        webp_name = f"g1-{slug}.webp"
        webp_path = os.path.join(out_dir, webp_name)
        im.save(webp_path, "WEBP", quality=quality, method=6, alpha_quality=100)
        frames_obj = {}
        for r, action in enumerate(meta["actions"]):
            for f in range(frames):
                frames_obj[f"{action}_{f}"] = {
                    "frame": {"x": f * cell, "y": r * cell, "w": cell, "h": cell},
                    "rotated": False,
                    "trimmed": False,
                    "spriteSourceSize": {"x": 0, "y": 0, "w": cell, "h": cell},
                    "sourceSize": {"w": cell, "h": cell},
                }
        atlas = {
            "frames": frames_obj,
            "meta": {
                "app": "chiatien game/tools (render-atlas + convert-atlas)",
                "version": "1",
                "image": webp_name,
                "format": "RGBA8888",
                "size": {"w": im.width, "h": im.height},
                "scale": "1",
            },
        }
        with open(os.path.join(out_dir, f"g1-{slug}.json"), "w") as fh:
            json.dump(atlas, fh, ensure_ascii=False, indent=1)
        size = os.path.getsize(webp_path)
        total += size
        print(f"{webp_name}: {size} B  sheet {im.width}x{im.height} cell {cell}")
    print(f"TONG WEBP: {total} B (tran B = 400000)")


if __name__ == "__main__":
    main()
