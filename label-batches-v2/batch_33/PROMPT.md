# Lô 33/43 — định vị vật thể theo mẫu tham chiếu

> **Cụm 4** — phiên này chỉ làm các lô 28–36, KHÔNG đụng lô ngoài khoảng đó.
> Nhiều phiên chạy song song, mỗi phiên một cụm; làm lấn cụm khác sẽ gây trùng việc và đụng file.

## Việc cần làm
Thư mục `images/` có 50 bài, đặt tên `batch_33_img001` … `batch_33_img050`. Mỗi bài gồm 4 file ảnh:
- `<tên bài>_scene.jpg` — ảnh cảnh 533x353 pixel: một ảnh chụp thật, bên trên có vài hình vẽ nét màu.
- `<tên bài>_icon1.png`, `_icon2.png`, `_icon3.png` — ba hình mẫu tham chiếu, pictogram đen trắng.

Với mỗi bài, tìm trong ảnh cảnh vị trí **TÂM** của hình vẽ khớp hình mẫu 1, hình mẫu 2, hình mẫu 3.

## Cách lấy ảnh (quan trọng)
**Cách 1 — tải cả lô một lần (nên dùng):** tải `images.zip` trong chính thư mục lô này rồi giải nén.
Giải nén ra đúng thư mục `images/` chứa toàn bộ `.jpg`/`.png`, mở xem trực tiếp bằng khả năng đọc
ảnh sẵn có. Một lần tải là đủ cho cả lô, không phải gọi từng file.

Đường dẫn: `https://raw.githubusercontent.com/gutbai/aki-mcp-sv-window/label-batches-v2/label-batches-v2/<lô>/images.zip`

**Cách 2 — tải từng file qua raw URL:** danh sách đầy đủ trong `IMAGE_URLS.md` cùng thư mục này.
Dạng URL: `https://raw.githubusercontent.com/gutbai/aki-mcp-sv-window/label-batches-v2/label-batches-v2/<lô>/images/<tên bài>_scene.jpg`

Đừng đọc ảnh qua GitHub Contents API: API đó trả về chuỗi base64 trong JSON nên không xem được ảnh.

Nếu cả hai cách trên đều không lấy được ảnh thì **báo lại là không xem được ảnh và dừng** — đừng
tìm đường vòng, và tuyệt đối đừng điền toạ độ khi chưa thật sự nhìn thấy ảnh.

## Quy ước toạ độ
Tính theo chính file `_scene.jpg`: gốc (0,0) ở góc trên-trái, x tăng sang phải, y tăng xuống dưới.
Hợp lệ: x trong [0, 533], y trong [0, 353].

## Lưu ý
- Trả TÂM của hình vẽ, không phải góc hay cạnh.
- Hình vẽ trong cảnh được tô màu và lớn hơn hình mẫu nhiều lần; hình mẫu chỉ là nét viền đen trắng. So sánh theo DÁNG, đừng theo màu.
- Ảnh cảnh có nhiều hình vẽ gây nhiễu, chỉ 3 hình khớp 3 mẫu mới tính.
- Mỗi bài trả đủ 3 toạ độ, đúng thứ tự mẫu 1, 2, 3.
- Làm hết 50 bài, không bỏ bài nào — nhưng "làm" gồm cả việc ĐÁNH DẤU BỎ QUA (xem dưới).

## Không chắc thì ĐÁNH DẤU, đừng đoán bừa
Đây là quy tắc quan trọng nhất của lô này.

Kết quả sẽ được dùng để huấn luyện mô hình, nên **một toạ độ đoán bừa có hại hơn hẳn một bài bỏ
trống**: bài bỏ trống thì người sẽ xem lại, còn toạ độ sai thì lẫn vào dữ liệu huấn luyện và dạy
mô hình học sai mà không ai biết.

Vậy nên khi rơi vào bất kỳ tình huống nào sau đây, hãy đánh dấu bỏ qua thay vì cố giải:
- Ảnh mờ, tối, bị che, hoặc hình vẽ lẫn vào nền đến mức không nhìn rõ.
- Không tìm thấy hình nào thật sự khớp hình mẫu.
- Có hai hình trông giống nhau, không phân biệt được cái nào mới đúng.
- Nhìn ra rồi nhưng không chắc tâm nằm đâu.

Cách đánh dấu: đặt `"coords": null` và ghi lý do ngắn gọn vào `notes`.

Cứ đánh dấu thoải mái, không bị tính là làm sai. Thà bỏ qua 10 bài khó còn hơn đoán bừa 1 bài.
Chỉ cần điền `coords` khi bạn thật sự nhìn rõ và tự tin.

## Nộp kết quả
Ghi ra file `RESULT.json` trong chính thư mục lô này, theo mẫu `RESULT_TEMPLATE.json`:

```json
{
  "<tên bài chắc chắn>": {
    "coords": [[x1, y1], [x2, y2], [x3, y3]],
    "notes": ""
  },
  "<tên bài không chắc>": {
    "coords": null,
    "notes": "anh qua toi, khong thay hinh khop mau 2"
  }
}
```

Chỉ JSON hợp lệ, không kèm chữ nào ngoài JSON.

## Xong lô nào PUSH lô đó, đừng để dồn
Làm xong `RESULT.json` của lô này thì commit và push NGAY, rồi mới sang lô kế tiếp:

```
git add batch_33/RESULT.json
git commit -m "result: batch_33"
git pull --rebase origin label-batches-v2
git push origin label-batches-v2
```

Lý do: phiên làm việc có thể bị ngắt giữa chừng, kết quả chưa push coi như mất. Push từng lô thì
hỏng phiên chỉ mất đúng lô đang làm dở.

`git pull --rebase` trước khi push là bắt buộc — các phiên khác cũng đang push cụm của họ, bỏ bước
này sẽ bị từ chối vì nhánh đã chạy tiếp. Mỗi phiên chỉ ghi `RESULT.json` trong cụm của mình nên
không bao giờ sửa cùng file, rebase sẽ không xung đột.
