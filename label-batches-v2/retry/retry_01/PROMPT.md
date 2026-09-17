# Lô làm lại 1/5 — định vị vật thể theo mẫu tham chiếu

> Đây là các bài lượt trước bị bỏ qua vì chưa đủ chắc chắn, nay gom lại làm lần hai.
> Bài khó hơn mức trung bình - hãy phóng to ảnh và nhìn kỹ trước khi quyết định.

## Việc cần làm
Thư mục `images/` có 53 bài. Mỗi bài gồm 4 file ảnh:
- `<tên bài>_scene.jpg` — ảnh cảnh 533x353 pixel: ảnh chụp thật, bên trên có vài hình vẽ nét màu.
- `<tên bài>_icon1.png`, `_icon2.png`, `_icon3.png` — ba hình mẫu tham chiếu, pictogram đen trắng.

Với mỗi bài, tìm trong ảnh cảnh vị trí **TÂM** của hình vẽ khớp hình mẫu 1, hình mẫu 2, hình mẫu 3.

## Cách lấy ảnh (quan trọng)
Ảnh của lô này đóng thành **một file zip**, tải theo **đường dẫn người giao việc đưa cho bạn**
(không ghi trong repo). Tải về, giải nén ra thư mục `images/`, rồi mở xem trực tiếp.

Nếu không lấy được ảnh thì **báo lại là không xem được ảnh và dừng** — đừng tìm đường vòng, và
tuyệt đối đừng điền toạ độ khi chưa thật sự nhìn thấy ảnh.

## Quy ước toạ độ
Tính theo chính file `_scene.jpg`: gốc (0,0) ở góc trên-trái, x tăng sang phải, y tăng xuống dưới.
Hợp lệ: x trong [0, 533], y trong [0, 353].

## Lưu ý
- Trả TÂM của hình vẽ, không phải góc hay cạnh.
- Hình vẽ trong cảnh được tô màu và lớn hơn hình mẫu nhiều lần; hình mẫu chỉ là nét viền đen trắng.
  So sánh theo DÁNG, đừng theo màu.
- Ảnh cảnh có nhiều hình vẽ gây nhiễu, chỉ 3 hình khớp 3 mẫu mới tính.
- Mỗi bài trả đủ 3 toạ độ, đúng thứ tự mẫu 1, 2, 3.

## Vẫn được phép bỏ qua, nhưng hãy cố hơn lượt trước
Những bài này đã bị bỏ một lần rồi. Hãy thật sự nhìn kỹ - phóng to, so từng nét - trước khi kết
luận. Chỉ khi nhìn kỹ rồi mà vẫn không chắc thì mới đặt `"coords": null` kèm lý do vào `notes`.

Vẫn giữ nguyên nguyên tắc: **một toạ độ đoán bừa có hại hơn hẳn một bài bỏ trống**. Đừng đoán để
lấp chỗ trống.

## Nộp kết quả
Ghi ra file `RESULT.json` trong chính thư mục lô này:

```json
{
  "<tên bài chắc chắn>": {"coords": [[x1, y1], [x2, y2], [x3, y3]], "notes": ""},
  "<tên bài không chắc>": {"coords": null, "notes": "ly do ngan gon"}
}
```

Chỉ JSON hợp lệ, không kèm chữ nào ngoài JSON.

## Xong lô nào PUSH lô đó, đừng để dồn
```
git add retry_01/RESULT.json
git commit -m "result: retry_01"
git pull --rebase origin label-batches-v2
git push origin label-batches-v2
```
