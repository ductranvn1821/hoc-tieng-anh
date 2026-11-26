# Thư viện ảnh từ vựng

609 ảnh (SVG + PNG 512px), chia theo cấp độ và chủ đề:

- `be/`: Mầm non - Tiểu học, 19 chủ đề (con vật, trái cây, màu sắc, số đếm, gia đình, phương tiện...)
- `thcs/`: Lớp 6-9, 20 chủ đề bám theo SGK (trường học, sở thích, giao thông, lễ hội, môi trường, năng lượng, công nghệ...)

Tra cứu nhanh: mở `index.csv` bằng Excel.

## Cập nhật

```
cd _tools
npm install                 # lần đầu
python build_library.py     # sau khi thêm từ vào vocab.json
python find_icon.py rabbit  # tìm tên icon
```

Chi tiết xem skill `.claude/skills/lay-hinh-tu-vung/SKILL.md`. Giấy phép xem `CREDITS.md`.
