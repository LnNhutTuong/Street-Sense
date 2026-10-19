# StreetSense – IoT Smart Streetlight System

**Sense the Street. Light the Way.**

StreetSense là hệ thống đèn đường thông minh dùng ESP32 và MicroPython. Hệ thống đo ánh sáng, nhiệt độ và độ ẩm để tự bật đèn đường khi trời tối, phát hiện điều kiện có thể gây sương mù, bật đèn phá sương và đèn cảnh báo, rồi gửi dữ liệu lên ThingSpeak để theo dõi từ xa qua web dashboard.

Dự án được mô phỏng trên Wokwi, và dashboard được triển khai trên Vercel: [street-sense-six.vercel.app](https://street-sense-six.vercel.app).

## Features

- **Tự động bật/tắt đèn đường** – Cảm biến ánh sáng LDR quyết định bật 3 đèn vàng khi trời tối và tắt khi trời sáng.
- **Phát hiện điều kiện sương mù** – Phân loại 3 mức (thấp, trung bình, cao) dựa trên nhiệt độ và độ ẩm từ DHT22.
- **Đèn phá sương và đèn cảnh báo** – Đèn xanh bật khi sương mù trung bình hoặc cao; đèn đỏ nhấp nháy khi sương mù cao.
- **Màn hình LCD1602 I2C** – Hiển thị mức sương mù, nhiệt độ và độ ẩm ngay tại thiết bị.
- **ThingSpeak Integration** – Gửi 8 field dữ liệu lên kênh ThingSpeak mỗi 15 giây.
- **Web Dashboard** – Hiển thị số liệu mới nhất, trạng thái từng đèn, biểu đồ lịch sử và bảng dữ liệu gần nhất; tự làm mới mỗi 20 giây.
- **Giao diện tối** – Dashboard dùng theme tối, hiển thị tốt trên cả máy tính và điện thoại.

## System Architecture

```
  DHT22 (nhiệt độ, độ ẩm)        LDR (ánh sáng)
             |                         |
             +------------+------------+
                          |
                          v
                 ESP32 (MicroPython)
                          |
        +-----------------+------------------+
        |                 |                  |
        v                 v                  v
  3 đèn vàng        Đèn xanh / đèn đỏ     LCD1602 I2C
 (GPIO 16/17/18)     (GPIO 23 / GPIO 19)   (SDA 21, SCL 22)
                          |
                          v
                 ThingSpeak (Channel 3536040)
                          |
                          v
                 Web Dashboard (Vercel)
```

## Hardware Components

| Component | Purpose | GPIO |
| --- | --- | --- |
| ESP32 DevKit C v4 | Bộ điều khiển chính và kết nối Wi-Fi | – |
| DHT22 | Đo nhiệt độ và độ ẩm | GPIO 15 |
| Cảm biến ánh sáng LDR | Xác định trời sáng hay tối (ADC) | GPIO 34 |
| 3 LED vàng | Mô phỏng đèn đường | GPIO 16, 17, 18 |
| LED xanh | Đèn phá sương | GPIO 23 |
| LED đỏ | Đèn cảnh báo sương mù (nhấp nháy) | GPIO 19 |
| LCD1602 giao tiếp I2C (địa chỉ `0x27`) | Hiển thị trạng thái tại chỗ | SDA 21, SCL 22 |
| 5 điện trở 220 Ω | Hạn dòng cho các LED | – |
| Breadboard và dây nối | Lắp mạch | – |

Sơ đồ nối dây đầy đủ nằm trong `diagram.json` (mở bằng Wokwi).

## Software and Technologies

- **Embedded:** MicroPython (`micropython-20231005-v1.21.0`) trên ESP32
- **Sensors and Actuators:** DHT22, LDR, LED, LCD1602 I2C (driver `i2c_lcd.py`)
- **Cloud Monitoring:** ThingSpeak
- **Frontend:** HTML, CSS, JavaScript, Chart.js, font Inter
- **Deployment:** Vercel
- **Simulation:** Wokwi

## How It Works

1. ESP32 đọc giá trị LDR liên tục. Nếu giá trị ADC lớn hơn ngưỡng `2000` thì coi là trời tối, bật cả 3 đèn vàng; ngược lại tắt cả 3 đèn.
2. Cứ mỗi 2 giây, ESP32 đọc nhiệt độ và độ ẩm từ DHT22.
3. ESP32 phân loại mức sương mù:

   | Mức | Điều kiện | Đèn xanh | Đèn đỏ |
   | --- | --- | --- | --- |
   | Cao (2) | độ ẩm ≥ 90% và nhiệt độ ≤ 25 °C | Bật | Nhấp nháy mỗi 500 ms |
   | Trung bình (1) | độ ẩm ≥ 80% và nhiệt độ ≤ 28 °C | Bật | Tắt |
   | Thấp (0) | Các trường hợp còn lại | Tắt | Tắt |

4. Nếu DHT22 đọc lỗi, hệ thống tắt đèn cảnh báo và LCD hiển thị thông báo lỗi cảm biến.
5. LCD cập nhật mỗi 500 ms, Serial Monitor in trạng thái mỗi 2 giây.
6. Cứ mỗi 15 giây, ESP32 gửi dữ liệu lên ThingSpeak qua Wi-Fi (khoảng cách này phù hợp giới hạn của kênh miễn phí).
7. Dashboard đọc dữ liệu từ kênh ThingSpeak Public và hiển thị trạng thái hiện tại cùng lịch sử.

> Mức sương mù là giá trị phân loại theo ngưỡng trong chương trình ESP32, không phải phép đo khí tượng chuyên dụng.

## ThingSpeak Data Fields

Channel ID: `3536040` (Public).

| Field | Nội dung | Giá trị |
| --- | --- | --- |
| Field 1 | Giá trị LDR | ADC, 0–4095 |
| Field 2 | Nhiệt độ | °C |
| Field 3 | Độ ẩm | % |
| Field 4 | Mức sương mù | 0 thấp, 1 trung bình, 2 cao |
| Field 5 | Trạng thái trời tối | 0 sáng, 1 tối |
| Field 6 | Số đèn vàng đang bật | 0 hoặc 3 theo chương trình hiện tại |
| Field 7 | Đèn xanh phá sương | 0 tắt, 1 bật |
| Field 8 | Đèn đỏ cảnh báo | 0 tắt, 1 bật (bật khi sương mù cao) |

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/LnNhutTuong/Street-Sense.git
cd Street-Sense
```

### 2. Configure the ESP32

1. Sao chép `secrets.example.py` thành `secrets.py`.
2. Điền thông tin của bạn trong `secrets.py`:
   - `WIFI_SSID`, `WIFI_PASSWORD`: mạng Wi-Fi (trên Wokwi giữ nguyên `Wokwi-GUEST` và mật khẩu rỗng).
   - `THINGSPEAK_API_KEY`: Write API Key của kênh ThingSpeak.
3. **Chạy trên Wokwi:** mở dự án Wokwi (xem `wokwi-project.txt`), thêm file `secrets.py` vào dự án cùng với `main.py` và `i2c_lcd.py`, rồi bấm Start Simulation.
4. **Chạy trên ESP32 thật:** nạp firmware MicroPython, rồi chép `main.py`, `i2c_lcd.py` và `secrets.py` lên board (ví dụ bằng Thonny hoặc `mpremote`). Kiểm tra lại các chân GPIO cho khớp mạch của bạn.

**Security:** Không commit `secrets.py` hay Write API Key lên GitHub.

### 3. Configure ThingSpeak

1. Tạo một kênh ThingSpeak và bật 8 field như bảng trên.
2. Đặt kênh ở chế độ Public nếu muốn dashboard đọc được mà không cần Read API Key.
3. Điền Write API Key của kênh vào `secrets.py`.
4. Kiểm tra kênh đã nhận dữ liệu trước khi mở dashboard.

### 4. Run the Web Dashboard

Dashboard là web tĩnh gồm `index.html`, `style.css`, `theme-dark.css` và `app.js`.

**Chạy trên máy (Ubuntu):**

```bash
python3 -m http.server 5500
```

Mở trình duyệt tại <http://localhost:5500>. Không nên mở `index.html` trực tiếp bằng `file://`.

**Triển khai lên Vercel (qua GitHub):**

1. Đăng nhập <https://vercel.com/> bằng GitHub.
2. Chọn **Add New → Project** và import repository này.
3. Framework Preset chọn **Other**, không cần Build Command. Nếu Vercel yêu cầu Output Directory, để `.` (thư mục gốc).
4. Nhấn **Deploy** và mở URL do Vercel cấp.

**Đổi kênh ThingSpeak:** sửa hằng số `CHANNEL_ID` ở đầu `app.js` (và Channel ID hiển thị ở thanh bên trong `index.html`).

## Security Notes

- Giữ Write API Key và mật khẩu Wi-Fi ngoài các file được theo dõi bởi Git; `secrets.py` đã nằm trong `.gitignore`.
- Dùng giá trị giả trong `secrets.example.py`.
- Dashboard chỉ đọc kênh Public, không cần và không chứa Write API Key.
- Kênh ThingSpeak Public cho phép bất kỳ ai xem dữ liệu của kênh.
- `main.py` gửi dữ liệu bằng HTTP và đặt API key trong URL. Cách này phù hợp để mô phỏng và học tập; nếu triển khai thực tế nên chuyển sang HTTPS.
- Nếu Write API Key từng bị đưa lên GitHub, hãy tạo key mới trong ThingSpeak (Generate New Write API Key), vì key cũ vẫn còn trong lịch sử commit.

## Project Structure

```
Street-Sense/
│
├── main.py              # Chương trình chính MicroPython cho ESP32
├── i2c_lcd.py           # Driver LCD1602 I2C
├── secrets.example.py   # Mẫu cấu hình Wi-Fi và Write API Key
├── diagram.json         # Sơ đồ mạch Wokwi
├── wokwi-project.txt    # Liên kết dự án Wokwi
├── index.html           # Giao diện dashboard
├── style.css            # Giao diện chính
├── theme-dark.css       # Theme tối và cỡ chữ
├── app.js               # Đọc dữ liệu ThingSpeak, vẽ biểu đồ
├── .gitignore
├── LICENSE
└── README.md
```

`secrets.py` (file thật) chỉ nằm trên máy của bạn và không được commit.

## Notes

- Dashboard tự tải lại dữ liệu mỗi 20 giây và có nút làm mới thủ công.
- Chart.js và font Inter được tải từ CDN, vì vậy cần Internet.
- Nếu không hiện dữ liệu, kiểm tra kênh có đặt Public, Channel ID đúng, ThingSpeak đã có dữ liệu mới và trình duyệt có Internet.
- Dashboard hiện chỉ giám sát, không gửi lệnh điều khiển ngược về ESP32.

## Future Improvements

- Thêm cảm biến thật và kiểm thử trên mạch ESP32 thực tế.
- Gửi thông báo (Telegram hoặc email) khi sương mù ở mức cao.
- Điều chỉnh ngưỡng ánh sáng và ngưỡng sương mù từ dashboard.
- Điều khiển đèn từ xa thay vì chỉ giám sát.
- Lưu lịch sử dài hạn và thêm thống kê theo ngày.
- Dùng HTTPS khi gửi dữ liệu lên ThingSpeak.

## Project Status

Dự án đang được phát triển cho mục đích mô phỏng và học tập trên Wokwi. Tính năng và cách triển khai có thể thay đổi.

## License

Dự án được cấp phép theo MIT License. Xem file [LICENSE](LICENSE) để biết chi tiết.

---

**StreetSense**  
*Một hướng tiếp cận IoT cho hệ thống đèn đường thông minh hơn.*
