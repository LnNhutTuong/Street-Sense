from time import sleep_ms
from machine import I2C

LCD_CLR = 0x01
LCD_HOME = 0x02
LCD_ENTRY_MODE = 0x04
LCD_DISPLAY_CTRL = 0x08
LCD_SHIFT = 0x10
LCD_FUNC = 0x20
LCD_CGRAM = 0x40
LCD_DDRAM = 0x80

LCD_ENTRY_LEFT = 0x02
LCD_ENTRY_SHIFT_DECREMENT = 0x00

LCD_DISPLAY_ON = 0x04
LCD_CURSOR_OFF = 0x00
LCD_BLINK_OFF = 0x00

LCD_FUNC_2LINES = 0x08
LCD_FUNC_5x8DOTS = 0x00

LCD_BACKLIGHT = 0x08
LCD_ENABLE = 0b00000100

class I2cLcd:

    def __init__(self, i2c, address, rows, cols):
        self.i2c = i2c
        self.address = address
        self.rows = rows
        self.cols = cols
        self.backlight = LCD_BACKLIGHT
        self.init_lcd()

    def init_lcd(self):
        self.lcd_write(0x03)
        sleep_ms(5)
        self.lcd_write(0x03)
        sleep_ms(5)
        self.lcd_write(0x03)
        sleep_ms(5)
        self.lcd_write(0x02)

        self.command(LCD_FUNC | LCD_FUNC_2LINES | LCD_FUNC_5x8DOTS)
        self.command(LCD_DISPLAY_CTRL | LCD_DISPLAY_ON | LCD_CURSOR_OFF | LCD_BLINK_OFF)
        self.command(LCD_CLR)
        self.command(LCD_ENTRY_MODE | LCD_ENTRY_LEFT | LCD_ENTRY_SHIFT_DECREMENT)
        sleep_ms(2)

    def lcd_write(self, data, mode=0):
        high = mode | (data & 0xF0) | self.backlight
        low = mode | ((data << 4) & 0xF0) | self.backlight
        self.i2c.writeto(self.address, bytes([high | LCD_ENABLE]))
        self.i2c.writeto(self.address, bytes([high & ~LCD_ENABLE]))
        self.i2c.writeto(self.address, bytes([low | LCD_ENABLE]))
        self.i2c.writeto(self.address, bytes([low & ~LCD_ENABLE]))

    def command(self, cmd):
        self.lcd_write(cmd, 0)

    def write_char(self, char):
        self.lcd_write(char, 1)

    def putstr(self, string):
        for char in string:
            self.write_char(ord(char))

    def clear(self):
        self.command(LCD_CLR)
        sleep_ms(2)

    def move_to(self, col, row):
        address = col + 0x40 * row
        self.command(LCD_DDRAM | address)
