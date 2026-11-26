"""Dựng / cập nhật thư viện ảnh từ vocab.json.

Cách dùng (chạy trong thư mục _tools):
    npm install                      # lần đầu: tải bộ icon
    python build_library.py          # thêm ảnh cho từ mới, giữ ảnh cũ
    python build_library.py --force  # tạo lại toàn bộ
    python build_library.py --size 1024   # PNG lớn hơn (mặc định 512)

Kết quả nằm ở thư mục cha (Database/image):
    <cap-do>/<chu-de>/<tu>.svg + .png, index.json, index.csv, CREDITS.md, missing.txt
Ảnh bạn tự thêm vào thư mục chủ đề (không có trong vocab.json) sẽ không bị xoá.
"""
import csv
import json
import shutil
import subprocess
import sys
from pathlib import Path

from iconlib import LICENSES, load_sets, resolve, slug

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
force = "--force" in sys.argv
size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 512

vocab = json.loads((HERE / "vocab.json").read_text(encoding="utf-8"))
sets = load_sets()
if not sets:
    sys.exit("Chưa có bộ icon. Chạy 'npm install' trong thư mục _tools trước.")

rows, missing, new_svgs, used_sets = [], [], [], set()
for lv_key, lv in vocab["levels"].items():
    for tp_key, tp in lv["topics"].items():
        folder = ROOT / lv_key / tp_key
        folder.mkdir(parents=True, exist_ok=True)
        for entry in tp["words"]:
            word, _, hint = entry.partition("|")
            word, hint = word.strip(), hint.strip().rstrip("?") or None
            fname = slug(word)
            svg_path = folder / f"{fname}.svg"
            png_path = folder / f"{fname}.png"
            found = resolve(word, hint)
            if not found:
                missing.append(f"{lv_key}/{tp_key}: {word}" + (f" (gợi ý '{hint}' không có)" if hint else ""))
                continue
            s, name = found
            used_sets.add(s)
            if force or not svg_path.exists():
                svg_path.write_text(sets[s].svg(name), encoding="utf-8")
                new_svgs.append(svg_path)
            elif not png_path.exists():
                new_svgs.append(svg_path)
            rows.append({
                "level": lv_key, "level_vi": lv["label"],
                "topic": tp_key, "topic_vi": tp["vi"],
                "word": word,
                "svg": svg_path.relative_to(ROOT).as_posix(),
                "png": png_path.relative_to(ROOT).as_posix(),
                "source": s, "icon": name, "license": LICENSES[s][1],
            })

# SVG -> PNG
if new_svgs:
    lst = HERE / "_png_list.txt"
    lst.write_text("\n".join(str(p) for p in new_svgs), encoding="utf-8")
    node = shutil.which("node")
    if node:
        subprocess.run([node, str(HERE / "svg2png.js"), str(size), str(lst)], check=True)
    else:
        print("Không thấy Node.js: chỉ có SVG, chưa tạo PNG.")
    lst.unlink(missing_ok=True)

(ROOT / "index.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
with open(ROOT / "index.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)
(ROOT / "missing.txt").write_text("\n".join(missing) or "(không thiếu từ nào)", encoding="utf-8")

credits = ["# Nguồn ảnh và giấy phép", "",
           "Ảnh trong thư mục này lấy từ các bộ emoji mã nguồn mở, dùng miễn phí kể cả thương mại.", ""]
for s in sorted(used_sets):
    n, lic, url = LICENSES[s]
    cnt = sum(r["source"] == s for r in rows)
    credits.append(f"- **{n}** ({cnt} ảnh) - giấy phép {lic} - {url}")
credits += ["", "Twemoji (CC-BY 4.0): khi phát hành sản phẩm cần ghi 'Graphics by Twemoji, CC-BY 4.0'.",
            "Cột `source` trong index.csv cho biết mỗi ảnh lấy từ bộ nào."]
(ROOT / "CREDITS.md").write_text("\n".join(credits), encoding="utf-8")

print(f"Tổng {len(rows)} ảnh | mới/cập nhật {len(new_svgs)} | thiếu {len(missing)} (xem missing.txt)")
