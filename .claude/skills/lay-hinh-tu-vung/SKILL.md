---
name: lay-hinh-tu-vung
description: Lấy/cập nhật ảnh minh hoạ từ vựng tiếng Anh (miễn phí, có giấy phép) vào thư viện Database/image, chia theo cấp độ (be = mầm non-tiểu học, thcs = lớp 6-9) và chủ đề. Dùng khi cần hình cho bài học, flashcard, thêm từ/chủ đề mới, hoặc tìm ảnh cho một từ.
---

# Lấy hình từ vựng cho dự án học tiếng Anh

Thư viện ảnh nằm ở `Database/image/` (trên máy: `F:\Hoc_tieng_Anh_Cho_Be\Database\image`).

```
Database/image/
  _tools/            vocab.json (danh sách từ), build_library.py, find_icon.py, iconlib.py, svg2png.js, package.json
  be/<chu-de>/       ảnh cho bé       (vd: be/01_animals/cat.svg + cat.png)
  thcs/<chu-de>/     ảnh cho THCS     (vd: thcs/09_traffic/traffic-light.png)
  index.json, index.csv   tra cứu: cấp độ, chủ đề, từ, đường dẫn ảnh, nguồn, giấy phép
  CREDITS.md, missing.txt
```

Nguồn ảnh: Microsoft Fluent Emoji (MIT) là chính; dự phòng Noto Emoji (Apache-2.0), rồi Twemoji (CC-BY 4.0, phải ghi nguồn). Tất cả cài qua npm, không cần API key.

## Lần đầu trên máy mới

```
cd Database/image/_tools
npm install
```
Cần Python 3 và Node.js.

## Thêm từ hoặc chủ đề mới

1. Tìm tên icon phù hợp: `python find_icon.py <tu-khoa>` (tiếng Anh). Thêm `--save ../_preview` để lưu SVG xem thử. Không thấy thì thử từ đồng nghĩa hoặc vật đại diện (vd: "traffic jam" → `automobile`, "Tet" → `red-envelope`).
2. Sửa `_tools/vocab.json`:
   - Thêm từ vào `levels.<be|thcs>.topics.<chu-de>.words` dạng `"tu"` hoặc `"tu|ten-icon"`.
   - Chủ đề mới: key dạng `NN_ten_khong_dau` (đánh số để thư mục xếp đúng thứ tự), kèm `"vi": "Tên tiếng Việt"`.
3. Chạy `python build_library.py`. Script chỉ tạo ảnh cho từ mới, giữ nguyên ảnh cũ và ảnh người dùng tự bỏ vào. `--force` để tạo lại hết, `--size 1024` để PNG lớn hơn.
4. Đọc `missing.txt`: từ nào thiếu thì quay lại bước 1 với gợi ý khác.
5. Kiểm tra bằng mắt: ghép vài PNG mới thành một ảnh lưới rồi xem, đảm bảo hình đúng nghĩa với từ (cách khớp gần đúng đôi khi chọn sai).

## Khi dùng ảnh trong bài học

- Tra `index.json` theo `word`/`topic` để lấy đường dẫn, không đoán tên file. Tên file = từ viết thường, nối bằng `-` (vd: `ice-cream.png`).
- Trong trang HTML của bài học, dùng đường dẫn tương đối từ trang tới `Database/image/...`. SVG nét hơn và nhẹ hơn; PNG dùng cho Word, PowerPoint, Canva.
- Với từ trừu tượng (tính cách, cảm xúc, môn học), hình chỉ mang tính gợi ý; nên kèm chữ.

## Nguồn khác khi emoji không đủ

- Pixabay / Pexels / Unsplash (ảnh chụp thật): cần API key miễn phí, chạy trên máy người dùng. Lưu ảnh vào đúng thư mục chủ đề và ghi nguồn vào `CREDITS.md`.
- Canva (đã kết nối): `generate-image` để tạo hình riêng.
- Không lấy ảnh có nhân vật hoạt hình có bản quyền, hoặc ảnh không rõ giấy phép.
