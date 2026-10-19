from machine import Pin, ADC, I2C
import dht
import time
import network
import urequests
from i2c_lcd import I2cLcd
import ntptime


# ============================================================
# 1. CAU HINH WIFI
# ============================================================

WIFI_SSID = "Wokwi-GUEST"
WIFI_PASSWORD = ""

wifi = network.WLAN(network.STA_IF)
wifi.active(True)

print("=================================")
print("===>> DANG KET NOI WI-FI... <<===")
print("=================================")

if not wifi.isconnected():
    wifi.connect(WIFI_SSID, WIFI_PASSWORD)

    wifi_start = time.ticks_ms()
    WIFI_TIMEOUT = 15000

    while not wifi.isconnected():
        if time.ticks_diff(
            time.ticks_ms(), wifi_start
        ) >= WIFI_TIMEOUT:
            print("Khong ket noi duoc Wi-Fi")
            break

        time.sleep(0.2)

if wifi.isconnected():
    print("Da ket noi Wi-Fi:", wifi.ifconfig())
else:
    print("He thong tiep tuc chay offline")


# ============================================================
# 2. CAU HINH THINGSPEAK
# ============================================================

# Thay bang Write API Key moi cua Channel
THINGSPEAK_API_KEY = "KGXM6DJ3NX0FQLZX"

THINGSPEAK_URL = "http://api.thingspeak.com/update"

# Gui du lieu moi 15 giay
SEND_INTERVAL = 15000

last_send = time.ticks_ms()


# ============================================================
# 3. KHOI TAO CAM BIEN
# ============================================================

# Cam bien anh sang LDR
ldr = ADC(Pin(34))
ldr.atten(ADC.ATTN_11DB)

# Cam bien nhiet do va do am DHT22
dht_sensor = dht.DHT22(Pin(15))


# ============================================================
# 4. KHOI TAO DEN LED
# ============================================================

# 3 den vang duong
yellow_leds = [
    Pin(16, Pin.OUT),
    Pin(17, Pin.OUT),
    Pin(18, Pin.OUT)
]

# Den pha suong
red_led = Pin(19, Pin.OUT)

# Den canh bao suong mu
blue_led = Pin(23, Pin.OUT)

# Tat tat ca den khi khoi dong
for led in yellow_leds:
    led.value(0)

red_led.value(0)
red_ledState = 0;

blue_led.value(0)


# ============================================================
# 5. KHOI TAO LCD1602 I2C
# ============================================================

i2c = I2C(
    0,
    scl=Pin(22),
    sda=Pin(21),
    freq=400000
)

lcd = I2cLcd(i2c, 0x27, 2, 16)
lcd.clear()


# ============================================================
# 6. CAU HINH HE THONG
# ============================================================

# Nguong anh sang
LIGHT_THRESHOLD = 2000

# Chu ky doc DHT22: 2 giay
DHT_INTERVAL = 2000
last_dht_read = time.ticks_add(
    time.ticks_ms(), -DHT_INTERVAL
)

# Chu ky nhap nhay den do: 500 ms
BLINK_INTERVAL = 500
blink_state = 0
last_blink = time.ticks_ms()

# Chu ky cap nhat LCD
LCD_INTERVAL = 500
last_lcd_update = time.ticks_ms()

# Chu ky in Serial Monitor
PRINT_INTERVAL = 2000
last_print = time.ticks_ms()

# Gia tri mac dinh
light_value = 0
temperature = 0.0
humidity = 0.0

fog_level = 0
fog_name = "THAP"

yellow_count = 0
is_dark = False
skyTime = "Troi sang"

sensor_ok = False


# ============================================================
# 7. HAM GUI DU LIEU LEN THINGSPEAK
# ============================================================

def send_to_thingspeak(
    light_value,
    temperature,
    humidity,
    fog_level,
    is_dark,
    yellow_count,
    defog_led_state,
    warning_led_state
):
    # Neu mat Wi-Fi thi thu ket noi lai
    if not wifi.isconnected():
        print("ThingSpeak: Mat Wi-Fi, dang thu ket noi")

        try:
            wifi.connect(WIFI_SSID, WIFI_PASSWORD)
        except Exception as e:
            print("Loi ket noi Wi-Fi:", e)

        return

    url = (
        THINGSPEAK_URL
        + "?api_key=" + THINGSPEAK_API_KEY
        + "&field1=" + str(light_value)
        + "&field2=" + str(temperature)
        + "&field3=" + str(humidity)
        + "&field4=" + str(fog_level)
        + "&field5=" + str(int(is_dark))
        + "&field6=" + str(yellow_count)
        + "&field7=" + str(defog_led_state)
        + "&field8=" + str(warning_led_state)
    )

    response = None

    try:
        response = urequests.get(url)
        result = response.text.strip()

        current_time = time.localtime()
        hour = current_time[3]
        minute = current_time[4]
        second = current_time[5]
        if result != "0":
            print(
                ">>>>ThingSpeak: Gui thanh cong, Entry ID =",
                result
            )
            print("Time:", "{:02d}:{:02d}:{:02d}".format(hour, minute, second))
        else:
            print(
                "ThingSpeak: Entry ID = 0, "
                "kiem tra API Key va tan suat gui"
            )

    except Exception as e:
        print("Loi gui ThingSpeak:", e)

    finally:
        if response is not None:
            response.close()


# ============================================================
# 8. VONG LAP CHINH
# ============================================================

lcd.move_to(0, 0)
lcd.putstr("He thong den duong")
lcd.move_to(0, 1)
lcd.putstr("da khoi dong")

print("He thong den duong da khoi dong")

while True:
    try:
        # ----------------------------------------------------
        # 8.1 DOC CAM BIEN ANH SANG
        # ----------------------------------------------------

        light_value = ldr.read()

        if light_value > LIGHT_THRESHOLD:
            # Troi toi: bat 3 den vang
            for led in yellow_leds:
                led.value(1)

            yellow_count = 3
            is_dark = True
            skyTime = "Troi toi"

        else:
            # Troi sang: tat 3 den vang
            for led in yellow_leds:
                led.value(0)

            yellow_count = 0
            is_dark = False
            skyTime = "Troi sang"


        # ----------------------------------------------------
        # 8.2 DOC DHT22 MOI 2 GIAY
        # ----------------------------------------------------

        now = time.ticks_ms()

        if time.ticks_diff(
            now, last_dht_read
        ) >= DHT_INTERVAL:

            # Cap nhat moc thoi gian truoc khi doc
            last_dht_read = now

            try:
                dht_sensor.measure()

                temperature = dht_sensor.temperature()
                humidity = dht_sensor.humidity()

                sensor_ok = True

            except Exception as e:
                sensor_ok = False

                print("Loi DHT22:", e)


        # ----------------------------------------------------
        # 8.3 XU LY MUC SUONG MU
        # ----------------------------------------------------

        if sensor_ok:

            if humidity >= 90 and temperature <= 25:
                fog_level = 2
                fog_name = "CAO"

                # Den canh bao mau xanh sang
                blue_led.value(1)

                # Den do nhap nhay khong dung sleep
                red_ledState = 1;
                now = time.ticks_ms()

                if time.ticks_diff(
                    now, last_blink
                ) >= BLINK_INTERVAL:

                    blink_state = 1 - blink_state
                    red_led.value(blink_state)
                    last_blink = now

            elif humidity >= 80 and temperature <= 28:
                fog_level = 1
                fog_name = "TRUNG BINH"

                blue_led.value(1)
                red_led.value(0)
                red_ledState = 0;
                blink_state = 0

            else:
                fog_level = 0
                fog_name = "THAP"

                blue_led.value(0)
                red_led.value(0)
                red_ledState = 0;
                blink_state = 0

        else:
            # Loi cam bien: tat den canh bao
            fog_level = 0
            fog_name = "LOI CAM BIEN"

            blue_led.value(0)
            red_led.value(0)
            blink_state = 0


        # ----------------------------------------------------
        # 8.4 CAP NHAT LCD MOI 500 MS
        # ----------------------------------------------------

        now = time.ticks_ms()

        if time.ticks_diff(
            now, last_lcd_update
        ) >= LCD_INTERVAL:

            last_lcd_update = now

            if sensor_ok:
                if fog_level == 2:
                    line1 = "SUONG MU CAO"
                elif fog_level == 1:
                    line1 = "SUONG MU TB"
                else:
                    line1 = "SUONG MU THAP"

                line2 = "T:{:.1f}C H:{:.0f}%".format(
                    temperature, humidity
                )

            else:
                line1 = "DHT22 READ ERROR"
                line2 = "Check sensor"

            lcd.move_to(0, 0)
            lcd.putstr(
                (line1 + "                ")[:16]
            )

            lcd.move_to(0, 1)
            lcd.putstr(
                (line2 + "                ")[:16]
            )


        # ----------------------------------------------------
        # 8.5 IN THONG TIN SERIAL MOI 2 GIAY
        # ----------------------------------------------------

        now = time.ticks_ms()

        if time.ticks_diff(
            now, last_print
        ) >= PRINT_INTERVAL:

            last_print = now

            print("------------------------------")
            print("Thoi gian:", skyTime)

            if sensor_ok:
                print("Nhiet do:", temperature, "C")
                print("Do am:", humidity, "%")
            else:
                print("DHT22: Khong doc duoc du lieu")

            print("Muc suong mu:", fog_name)
            print("So den vang:", yellow_count)
            print("Den pha suong:", blue_led.value())
            print("Den canh bao:", red_ledState)


        # ----------------------------------------------------
        # 8.6 GUI DU LIEU LEN THINGSPEAK
        # ----------------------------------------------------

        now = time.ticks_ms()

        if (
            sensor_ok
            and time.ticks_diff(now, last_send) >= SEND_INTERVAL
        ):
            send_to_thingspeak(
                light_value,
                temperature,
                humidity,
                fog_level,
                is_dark,
                yellow_count,
                blue_led.value(),
                red_ledState
            )

            last_send = time.ticks_ms()


    except Exception as e:
        print("Loi he thong:", e)

    # Cho ngan de vong lap khong chay qua nhanh
    time.sleep(0.05)
