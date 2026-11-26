"""Tra tên icon theo từ khoá.  Dùng: python find_icon.py <tu-khoa> [--save thu-muc]"""
import sys
from pathlib import Path
from iconlib import search, load_sets

if len(sys.argv) < 2:
    sys.exit("Dùng: python find_icon.py <tu-khoa> [--save thu-muc]")
kw = sys.argv[1]
hits = search(kw)
if not hits:
    print("Không thấy icon nào. Thử từ đồng nghĩa (vd: 'car' -> 'automobile').")
for s, n in hits:
    print(f"{s:20} {n}")
if "--save" in sys.argv and hits:
    out = Path(sys.argv[sys.argv.index("--save") + 1])
    out.mkdir(parents=True, exist_ok=True)
    sets = load_sets()
    for s, n in hits[:12]:
        (out / f"{s}__{n}.svg").write_text(sets[s].svg(n), encoding="utf-8")
    print(f"Đã lưu {min(12, len(hits))} SVG xem thử vào {out}")
