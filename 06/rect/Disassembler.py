import sys, os

COMP = {
    "0101010":"0",   "0111111":"1",   "0111010":"-1",  "0001100":"D",   "0110000":"A",
    "0001101":"!D",  "0110001":"!A",  "0001111":"-D",  "0110011":"-A",  "0011111":"D+1",
    "0110111":"A+1", "0001110":"D-1", "0110010":"A-1", "0000010":"D+A", "0010011":"D-A",
    "0000111":"A-D", "0000000":"D&A", "0010101":"D|A",
    "1110000":"M",   "1110001":"!M",  "1110011":"-M",  "1110111":"M+1", "1110010":"M-1",
    "1000010":"D+M", "1010011":"D-M", "1000111":"M-D", "1000000":"D&M", "1010101":"D|M"
}
DEST = {"000":"", "001":"M=", "010":"D=", "011":"MD=", "100":"A=", "101":"AM=", "110":"AD=", "111":"AMD="}
JUMP = {"000":"", "001":";JGT", "010":";JEQ", "011":";JGE", "100":";JLT", "101":";JNE", "110":";JLE", "111":";JMP"}

def decode(line):
    b = line.strip()
    if len(b) != 16: return ""
    if b[0] == "0": return f"@{int(b[1:], 2)}"
    if b.startswith("111"):
        return f"{DEST.get(b[10:13],'')}{COMP[b[3:10]]}{JUMP.get(b[13:16],'')}"
    return ""

inp = sys.argv[1]
out = os.path.splitext(inp)[0] + "_disassembled.asm"
with open(inp, "r", encoding="utf-8") as fi, open(out, "w", encoding="utf-8") as fo:
    for l in fi:
        res = decode(l)
        if res: fo.write(res + "\n")
print("反組譯完成！已生成新檔案:", out)
