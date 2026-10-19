# StreetSense: Smart Streetlight Dashboard

Dashboard giám sát hệ thống đèn đường ESP32 + ThingSpeak, viết bằng HTML, CSS, JavaScript và Chart.js.

## Dữ liệu ThingSpeak

Channel ID được cấu hình sẵn: `3536040` (Public).

| Field | Nội dung | Đơn vị |
|---|---|---|
| Field 1 | Giá trị LDR | ADC, 0–4095 |
| Field 2 | Nhiệt độ | °C |
| Field 3 | Độ ẩm | % |
| Field 4 | Mức sương mù | 0 thấp, 1 trung bình, 2 cao |
| Field 5 | Trạng thái trời tối | 0 sáng, 1 tối |
| Field 6 | Số đèn vàng đang bật | 0 hoặc 3 theo chương trình hiện tại |
| Field 7 | Đèn đỏ pha sương | 0 tắt, 1 bật |
| Field 8 | Đèn xanh cảnh báo | 0 tắt, 1 bật |

> Dashboard chỉ đọc dữ liệu từ kênh Public. Không cần và không sử dụng Write API Key.

## Chạy trên Ubuntu

1. Giải nén thư mục dự án.
2. Mở Terminal trong thư mục `smart-streetlight-dashboard`.
3. Chạy máy chủ tĩnh:

   ```bash
   python3 -m http.server 5500
   ```

4. Mở trình duyệt tại <http://localhost:5500>.

Không nên chỉ mở file `index.html` bằng `file://`; chạy qua HTTP giúp tránh một số hạn chế của trình duyệt.

## Triển khai lên Vercel

### Cách 1: Qua GitHub (khuyến nghị)

1. Tạo repository mới trên GitHub, ví dụ `smart-streetlight-dashboard`.
2. Đưa ba file `index.html`, `style.css`, `app.js` và file `README.md` vào repository.
3. Đăng nhập <https://vercel.com/> bằng GitHub.
4. Chọn **Add New → Project**, import repository vừa tạo.
5. Framework Preset chọn **Other**; không cần Build Command. Nếu Vercel yêu cầu Output Directory, để `.` (thư mục gốc).
6. Nhấn **Deploy**. Sau khi hoàn tất, mở URL được Vercel cấp.

### Cách 2: Dùng Vercel CLI

Cần cài Node.js/npm trước, sau đó:

```bash
npm install -g vercel
cd smart-streetlight-dashboard
vercel
```

Làm theo câu hỏi trong terminal. Khi muốn triển khai bản production:

```bash
vercel --prod
```

## Cập nhật Channel ID

Nếu đổi kênh ThingSpeak, sửa hằng số `CHANNEL_ID` ở đầu `app.js`.

## Lưu ý

- Dashboard tự tải lại dữ liệu mỗi 20 giây và có nút làm mới thủ công.
- Chart.js và font Inter được tải từ CDN, vì vậy cần Internet.
- Nếu không hiện dữ liệu, kiểm tra kênh có đặt Public, Channel ID đúng, ThingSpeak đã có feed mới và trình duyệt có Internet.
- Mức sương mù là giá trị phân loại do chương trình ESP32 gửi lên, không phải phép đo khí tượng chuyên dụng.
- Dashboard hiện là giao diện giám sát. Nó không gửi lệnh điều khiển ngược về ESP32.
