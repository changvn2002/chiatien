#!/usr/bin/env python3
"""build-sets.py — nén sheet thô của lane A3 thành WebP + JSON Phaser + anchors
+ SETS-MANIFEST.json trong public/game/atlas/sets/<setId>/.

Dùng: python3 game/tools/build-sets.py [quality]
Đọc  ~/workspace/mini-apps/chiatien-game-v2/scratch-a3/raw-sets/<setId>/<key>.png
     + <key>.meta.json (do render-set.mjs sinh, chứa actions/anchors/variant).
Đo byte theo cách của coordinator: WebP raw + JSON gzip. In bảng tổng từng bộ.
"""
import gzip
import json
import os
import sys

from PIL import Image

HOME = os.path.expanduser("~")
RAW = f"{HOME}/workspace/mini-apps/chiatien-game-v2/scratch-a3/raw-sets"
OUT = f"{HOME}/workspace/mini-apps/chiatien/public/game/atlas/sets"
QUALITY = int(sys.argv[1]) if len(sys.argv) > 1 else 70

SET_INFO = {
    "adventurers": {
        "displayName": "Phiêu Lưu",
        "theme": "Hiệp sĩ, chiến binh, pháp sư và thích khách dũng cảm",
        "license": "CC0 1.0",
        "licenseSource": "LICENSE.txt trong repo chính chủ github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 (đọc trực tiếp đợt REBUILD-C, bản sao scratch-a/LICENSE-kaykit.txt) + trang itch.io kaylousberg.itch.io/kaykit-adventurers ghi CC0",
        "source": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
    },
    "skeletons": {
        "displayName": "Xương Khô",
        "theme": "Bộ xương ngộ nghĩnh — hù nhau cho vui",
        "license": "CC0 1.0",
        "licenseSource": "LICENSE.txt trong repo chính chủ github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0, dòng 'License: (Creative Commons Zero, CC0)' (đọc trực tiếp 2026-10-25, bản sao scratch-a3/LICENSE-kaykit-skeletons.txt) + trang itch.io kaylousberg.itch.io/kaykit-skeletons ghi CC0",
        "source": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0",
    },
    "blocky": {
        "displayName": "Bạn Khối",
        "theme": "Người khối vuông, mỗi bạn một bộ đồ riêng",
        "license": "CC0 1.0",
        "licenseSource": "License.txt trong zip tải từ kenney.nl chính chủ (kenney_blocky-characters_20.zip), dòng 'License: (Creative Commons Zero, CC0)' (đọc trực tiếp 2026-10-25) + trang kenney.nl/assets/blocky-characters ghi Creative Commons CC0",
        "source": "https://kenney.nl/assets/blocky-characters",
    },
}

# Ghi chú phân biệt cho biến thể (khớp cấu hình trong render-set.mjs)
DISTINGUISH = {
    "knight": "model gốc, mũ giáp + áo choàng đỏ, màu nguyên bản",
    "barbarian": "model gốc, mũ sừng + râu, màu nguyên bản",
    "mage": "model gốc, mũ chóp nhọn + áo choàng, màu nguyên bản",
    "rogue": "model gốc, tóc + áo choàng, màu nguyên bản",
    "roguehooded": "model gốc, đầu trùm mũ hood, màu nguyên bản",
    "knight-red": "Knight bỏ mũ giáp (thấy đầu/tóc) + trang phục nhuộm đỏ C62828",
    "barbarian-ice": "Barbarian bỏ mũ sừng + trang phục nhuộm xanh băng 1565C0",
    "mage-purple": "Mage bỏ mũ chóp + trang phục nhuộm tím 6A1B9A",
    "rogue-orange": "Rogue bỏ áo choàng + trang phục nhuộm cam E65100",
    "hooded-teal": "Rogue_Hooded bỏ áo choàng + trang phục nhuộm ngọc 00695C, giữ hood",
    "knight-night": "Knight giữ mũ giáp, bỏ áo choàng + trang phục nhuộm thép tối 263238",
    "mage-leaf": "Mage giữ mũ chóp, bỏ áo choàng + trang phục nhuộm xanh lá 2E7D32",
    "skel-warrior": "model gốc, mũ gai + giáp, xương nguyên bản",
    "skel-minion": "model gốc, áo choàng rách, xương nguyên bản",
    "skel-rogue": "model gốc, hood + áo choàng, xương nguyên bản",
    "skel-mage": "model gốc, mũ chóp, xương nguyên bản",
    "skel-warrior-ghost": "Warrior tint toàn thân xanh ma 7FE0B2, giữ mũ gai",
    "skel-minion-ember": "Minion tint toàn thân cam lửa FF9A5C",
    "skel-rogue-frost": "Rogue tint toàn thân xanh băng 8FD0FF + bỏ hood (lộ sọ)",
    "skel-mage-gold": "Mage tint toàn thân vàng FFD94D + bỏ mũ chóp (lộ sọ)",
    "skel-warrior-ash": "Warrior tint toàn thân xám tro 9AA3AD + bỏ mũ (lộ sọ)",
    "skel-minion-rose": "Minion tint toàn thân hồng FF9FB0 + bỏ áo choàng",
    "skel-rogue-mint": "Rogue tint toàn thân ngọc bạc hà 5CE8C8 + bỏ áo choàng, giữ hood",
    "skel-mage-violet": "Mage tint toàn thân tím C79BFF, giữ mũ chóp",
}


def blocky_distinguish(key: str) -> str:
    ch = key.split("-")[1]
    return f"model character-{ch} của pack, texture trang phục/tóc riêng (không tint, không biến thể nhân tạo)"


def main() -> None:
    # ONLY_SET=<setId> (lane A5 FIX-V4.1): chỉ build lại bộ đó và THAY entry
    # của nó trong SETS-MANIFEST.json hiện hành — entry của các bộ khác +
    # theme/preview đã chốt giữ nguyên byte-for-byte về nội dung, không
    # ghi đè atlas của hai bộ kia.
    only_set = os.environ.get("ONLY_SET") or None
    manifest_path = os.path.join(OUT, "SETS-MANIFEST.json")
    existing_manifest = None
    if only_set and os.path.isfile(manifest_path):
        existing_manifest = json.load(open(manifest_path))
    manifest = existing_manifest or {
        "generatedBy": "chiatien game/tools (render-set.mjs + build-sets.py) — lane A3 FIX-V3",
        "contract": "Mỗi bộ: public/game/atlas/sets/<setId>/<modelKey>.webp + <modelKey>.json (Phaser 3 hash, key frame '<action>_<idx>') + anchors.json của bộ. Tải lười: chỉ tải bộ đã chọn.",
        "sets": [],
    }
    built_entries = []
    grand_webp = 0
    for set_id, info in SET_INFO.items():
        if only_set and set_id != only_set:
            continue
        raw_dir = os.path.join(RAW, set_id)
        if not os.path.isdir(raw_dir):
            print(f"BO QUA {set_id}: chua co raw")
            continue
        out_dir = os.path.join(OUT, set_id)
        os.makedirs(out_dir, exist_ok=True)
        keys = sorted(f[:-4] for f in os.listdir(raw_dir) if f.endswith(".png"))
        chars = []
        anchors_doc = {}
        set_webp = 0
        set_jsongz = 0
        cell = cols = rows = None
        actions_meta = None
        for key in keys:
            meta = json.load(open(os.path.join(raw_dir, key + ".meta.json")))
            cell, cols, rows = meta["cell"], meta["cols"], meta["rows"]
            actions_meta = meta["actions"]
            im = Image.open(os.path.join(raw_dir, key + ".png")).convert("RGBA")
            webp_name = f"{key}.webp"
            webp_path = os.path.join(out_dir, webp_name)
            im.save(webp_path, "WEBP", quality=QUALITY, method=6, alpha_quality=100)
            frames_obj = {}
            for r, a in enumerate(meta["actions"]):
                for f in range(a["frames"]):
                    frames_obj[f"{a['action']}_{f}"] = {
                        "frame": {"x": f * cell, "y": r * cell, "w": cell, "h": cell},
                        "rotated": False,
                        "trimmed": False,
                        "spriteSourceSize": {"x": 0, "y": 0, "w": cell, "h": cell},
                        "sourceSize": {"w": cell, "h": cell},
                    }
            atlas = {
                "frames": frames_obj,
                "meta": {
                    "app": "chiatien game/tools (render-set + build-sets)",
                    "version": "1",
                    "image": webp_name,
                    "format": "RGBA8888",
                    "size": {"w": im.width, "h": im.height},
                    "scale": "1",
                },
            }
            json_bytes = json.dumps(atlas, ensure_ascii=False, indent=1).encode()
            with open(os.path.join(out_dir, f"{key}.json"), "wb") as fh:
                fh.write(json_bytes)
            wsize = os.path.getsize(webp_path)
            jgz = len(gzip.compress(json_bytes))
            set_webp += wsize
            set_jsongz += jgz
            anchors_doc[key] = meta["anchors"]
            chars.append({
                "modelKey": key,
                "displayName": meta.get("displayName", key),
                "baseModel": meta.get("baseModel"),
                "variantOf": meta.get("variantOf"),
                "variant": meta.get("variant"),
                "distinguish": DISTINGUISH.get(key) or (blocky_distinguish(key) if set_id == "blocky" else ""),
                "webp": f"sets/{set_id}/{webp_name}",
                "webpBytes": wsize,
                "jsonGzipBytes": jgz,
                "headNodeFound": meta.get("headNodeFound"),
            })
        with open(os.path.join(out_dir, "anchors.json"), "w") as fh:
            json.dump({
                "setId": set_id,
                "note": "Neo đầu per-frame: toạ độ chuẩn hoá 0..1 TRONG Ô frame (x trái→phải, y trên→dưới), tính từ xương/node 'head' + 0,30 đơn vị lên, chiếu qua camera render. Key: <modelKey> → <action> → mảng theo idx frame.",
                "cell": cell,
                "characters": anchors_doc,
            }, fh, ensure_ascii=False, indent=1)
        agz = len(gzip.compress(open(os.path.join(out_dir, "anchors.json"), "rb").read()))
        entry = {
            "setId": set_id,
            **info,
            "dir": f"public/game/atlas/sets/{set_id}/",
            "cell": cell,
            "cols": cols,
            "rows": rows,
            "sheetSize": {"w": cols * cell, "h": rows * cell},
            "actions": [
                {"action": a["action"], "clip": a["clip"], "frames": a["frames"],
                 "segment": [a["t0"], a["t1"]], "normalized": a["normalize"]}
                for a in actions_meta
            ],
            "anchorsFile": f"sets/{set_id}/anchors.json",
            "anchorsGzipBytes": agz,
            "characters": chars,
            "totalWebpBytes": set_webp,
            "totalJsonGzipBytes": set_jsongz,
            "totalBytes": set_webp + set_jsongz,
        }
        # Sheet xem truoc (lane A4 FIX-V4, build-previews.py sinh): giu truong
        # preview trong manifest khi file sheet da ton tai, tranh chay lai
        # build-sets.py lam mat truong nay.
        if os.path.isfile(os.path.join(OUT, f"{set_id}-preview.webp")):
            entry["preview"] = {"webp": f"sets/{set_id}-preview.webp", "cell": 192, "cols": 4}
        built_entries.append(entry)
        grand_webp += set_webp
        print(f"{set_id}: {len(chars)} nhan vat, cell {cell}, WebP {set_webp} B, JSONgz {set_jsongz} B, anchorsgz {agz} B, TONG {set_webp + set_jsongz + agz} B")
    if only_set and existing_manifest is not None:
        by_id = {e["setId"]: e for e in built_entries}
        manifest["sets"] = [by_id.get(s.get("setId"), s) for s in existing_manifest.get("sets", [])]
        for e in built_entries:
            if e["setId"] not in {s.get("setId") for s in manifest["sets"]}:
                manifest["sets"].append(e)
    else:
        manifest["sets"] = built_entries
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f"SETS-MANIFEST.json da ghi; tong WebP cac bo vua build: {grand_webp} B")


if __name__ == "__main__":
    main()
