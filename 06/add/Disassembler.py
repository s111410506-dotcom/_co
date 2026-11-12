import sys
import os

# 精確拆分 a 位元 (a=0 為 A/D 暫存器, a=1 為 M 記憶體)
COMP_A0 = {
    "0101010": "0",   "0111111": "1",   "0111010": "-1",
    "0001100": "D",   "0110000": "A",   "0001101": "!D",
    "0110001": "!A",  "0001111": "-D",  "0110011": "-A",
    "0011111": "D+1", "0011101": "A+1", "0001110": "D-1",
    "0110010": "A-1", "0000010": "D+A", "0010011": "D-A",
    "0000111": "A-D", "0000000": "D+A", "0010101": "D|A"  # 確保 0000000 在 A0 情況下解析為 D+A
}

COMP_A1 = {
    "1110000": "M",   "1001101": "!M",  "1110011": "-M",
    "1011101": "M+1", "1001110": "M-1", "1000010": "D+M",
    "1010011": "D-M", "1000111": "M-D", "1000000": "D+M",
    "1010101": "D|M"
}

DEST_REVERSE = {
    "000": "",    "001": "M=",   "010": "D=",   "011": "MD=",
    "100": "A=",  "101": "AM=",  "110": "AD=",  "111": "AMD="
}

JUMP_REVERSE = {
    "000": "",     "001": ";JGT", "010": ";JEQ", "011": ";JGE",
    "100": ";JLT", "101": ";JNE", "110": ";JLE", "111": ";JMP"
}

def decode_line(binary_line):
    binary_line = binary_line.strip()
    if not binary_line or len(binary_line) != 16:
        return ""
    
    # A 指令: 0開頭
    if binary_line.startswith("0"):
        value = int(binary_line[1:], 2)
        return f"@{value}"
    
    # C 指令: 111開頭 (111 + a + c1~c6 + dest + jump)
    elif binary_line.startswith("111"):
        a_bit = binary_line[3]
        comp_bits = binary_line[3:10]  # 包含 a 位元共 7 位
        dest_code = binary_line[10:13]
        jump_code = binary_line[13:16]

        dest_str = DEST_REVERSE.get(dest_code, "")
        jump_str = JUMP_REVERSE.get(jump_code, "")

        # 根據 a 位元強制對應 correct comp 助記符
        if a_bit == "0":
            comp_str = COMP_A0.get(comp_bits, "D+A")
        else:
            comp_str = COMP_A1.get(comp_bits, "D+M")

        return f"{dest_str}{comp_str}{jump_str}"
    
    return ""

def disassemble(hack_filepath):
    asm_filepath = os.path.splitext(hack_filepath)[0] + "_disassembled.asm"
    
    with open(hack_filepath, "r", encoding="utf-8") as hack_file, \
         open(asm_filepath, "w", encoding="utf-8") as asm_file:
        
        for line in hack_file:
            asm_code = decode_line(line)
            if asm_code:
                asm_file.write(asm_code + "\n")
                
    print(f"反組譯完成！已輸出至: {asm_filepath}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        disassemble(sys.argv[1])
    else:
        print("用法: python Disassembler.py <檔案路徑.hack>")