"""Đọc các bộ icon Iconify (cài bằng npm) và xuất SVG."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Thứ tự ưu tiên: Fluent Emoji (đẹp, hợp trẻ em) -> Noto -> Twemoji
SETS = ["fluent-emoji-flat", "noto", "twemoji"]
LICENSES = {
    "fluent-emoji-flat": ("Microsoft Fluent Emoji", "MIT", "https://github.com/microsoft/fluentui-emoji"),
    "noto": ("Google Noto Emoji", "Apache-2.0", "https://github.com/googlefonts/noto-emoji"),
    "twemoji": ("Twemoji", "CC-BY-4.0 (bắt buộc ghi nguồn)", "https://github.com/jdecked/twemoji"),
}


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


class IconSet:
    def __init__(self, prefix):
        p = HERE / "node_modules" / "@iconify-json" / prefix / "icons.json"
        d = json.loads(p.read_text(encoding="utf-8"))
        self.prefix = prefix
        self.icons = d["icons"]
        self.aliases = d.get("aliases", {})
        self.w = d.get("width", 16)
        self.h = d.get("height", 16)

    def names(self):
        return list(self.icons) + list(self.aliases)

    def has(self, name):
        return name in self.icons or name in self.aliases

    def svg(self, name):
        while name in self.aliases:
            name = self.aliases[name]["parent"]
        ic = self.icons[name]
        w, h = ic.get("width", self.w), ic.get("height", self.h)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
                f'viewBox="{ic.get("left", 0)} {ic.get("top", 0)} {w} {h}">{ic["body"]}</svg>')


_cache = {}


def load_sets():
    if not _cache:
        for s in SETS:
            try:
                _cache[s] = IconSet(s)
            except FileNotFoundError:
                pass
    return _cache


def resolve(word, hint=None):
    """Trả về (bộ, tên icon) hoặc None. Thử gợi ý, rồi tên từ, rồi khớp gần đúng."""
    sets = load_sets()
    cands = []
    if hint:
        cands.append(slug(hint))
    w = slug(word)
    cands += [w, w + "-face", w.rstrip("s")]
    for c in cands:
        for s, ic in sets.items():
            if c and ic.has(c):
                return s, c
    # gần đúng: tên icon chứa đủ các chữ của từ
    toks = [t for t in (slug(hint) if hint else w).split("-") if t]
    for s, ic in sets.items():
        hits = [n for n in ic.names() if all(t in n.split("-") for t in toks)]
        if hits:
            return s, min(hits, key=len)
    return None


def search(keyword, limit=30):
    toks = slug(keyword).split("-")
    out = []
    for s, ic in load_sets().items():
        for n in ic.names():
            if all(any(t in part for part in n.split("-")) for t in toks):
                out.append((s, n))
    out.sort(key=lambda x: (SETS.index(x[0]), len(x[1])))
    return out[:limit]
