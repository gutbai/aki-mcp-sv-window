# Lô 16/27 — định vị vật thể theo mẫu tham chiếu

## Việc cần làm
Thư mục `images/` có 50 bài, đặt tên `batch_16_img001` … `batch_16_img050`. Mỗi bài gồm 4 file ảnh:
- `<tên bài>_scene.jpg` — ảnh cảnh 533x353 pixel: một ảnh chụp thật, bên trên có vài hình vẽ nét màu.
- `<tên bài>_icon1.png`, `_icon2.png`, `_icon3.png` — ba hình mẫu tham chiếu, pictogram đen trắng.

Với mỗi bài, tìm trong ảnh cảnh vị trí **TÂM** của hình vẽ khớp hình mẫu 1, hình mẫu 2, hình mẫu 3.

## Cách lấy ảnh (quan trọng)
Ảnh phải được tải qua **raw URL** — xem danh sách đầy đủ trong `IMAGE_URLS.md` cùng thư mục này.
Dạng URL: `https://raw.githubusercontent.com/gutbai/aki-mcp-sv-window/label-batches/label-batches/<lô>/images/<tên bài>_scene.jpg`

Đừng đọc ảnh qua GitHub Contents API: API đó trả về chuỗi base64 trong JSON nên không xem được ảnh.
Raw URL trả đúng `image/jpeg` / `image/png`, mở xem trực tiếp được.

## Quy ước toạ độ
Tính theo chính file `_scene.jpg`: gốc (0,0) ở góc trên-trái, x tăng sang phải, y tăng xuống dưới.
Hợp lệ: x trong [0, 533], y trong [0, 353].

## Lưu ý
- Trả TÂM của hình vẽ, không phải góc hay cạnh.
- Hình vẽ trong cảnh được tô màu và lớn hơn hình mẫu nhiều lần; hình mẫu chỉ là nét viền đen trắng. So sánh theo DÁNG, đừng theo màu.
- Ảnh cảnh có nhiều hình vẽ gây nhiễu, chỉ 3 hình khớp 3 mẫu mới tính.
- Mỗi bài trả đủ 3 toạ độ, đúng thứ tự mẫu 1, 2, 3.
- Làm hết 50 bài, không bỏ bài nào. Nếu một hình mẫu thật sự không tìm thấy trong cảnh, vẫn trả toạ độ của thứ giống nhất và ghi lý do vào `notes`.

## Nộp kết quả
Ghi ra file `RESULT.json` trong chính thư mục lô này, theo mẫu `RESULT_TEMPLATE.json`:

```json
{
  "<tên bài>": {
    "coords": [[x1, y1], [x2, y2], [x3, y3]],
    "notes": ""
  }
}
```

Chỉ JSON hợp lệ, không kèm chữ nào ngoài JSON.
