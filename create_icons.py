import zlib
import struct

def create_icon(size, filename):
    # PNG заголовок
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr_chunk = b'IHDR' + ihdr_data
    ihdr_crc = zlib.crc32(ihdr_chunk) & 0xffffffff
    ihdr = struct.pack('>I', len(ihdr_data)) + ihdr_chunk + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (создаем простой узор)
    pattern = b'\x00' + b'\x10\xb9\x81' * size
    idat_data = zlib.compress(pattern * size)
    idat_chunk = b'IDAT' + idat_data
    idat_crc = zlib.crc32(idat_chunk) & 0xffffffff
    idat = struct.pack('>I', len(idat_data)) + idat_chunk + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_chunk = b'IEND'
    iend_crc = zlib.crc32(iend_chunk) & 0xffffffff
    iend = struct.pack('>I', 0) + iend_chunk + struct.pack('>I', iend_crc)
    
    # Собираем PNG
    png_data = png_signature + ihdr + idat + iend
    
    # Сохраняем файл
    with open(filename, 'wb') as f:
        f.write(png_data)

# Создаем иконки
create_icon(192, 'icon-192.png')
create_icon(512, 'icon-512.png')
print("Иконки созданы")