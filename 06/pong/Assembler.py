import sys, os
COMP = {
    "0":"0101010",  "1":"0111111",  "-1":"0111010", "D":"0001100",  "A":"0110000",
    "!D":"0001101", "!A":"0110001", "-D":"0001111", "-A":"0110011", "D+1":"0011111",
    "A+1":"0110111","D-1":"0001110","A-1":"0110010","D+A":"0000010","D-A":"0010011",
    "A-D":"0000111","D&A":"0000000","D|A":"0010101",
    "M":"1110000",  "!M":"1110001", "-M":"1110011", "M+1":"1110111","M-1":"1110010",
    "D+M":"1000010","D-M":"1010011","M-D":"1000111","D&M":"1000000","D|M":"1010101"
}
DEST = {None:"000","M":"001","D":"010","MD":"011","DM":"011","A":"100","AM":"101","AD":"110","AMD":"111","ADM":"111"}
JUMP = {None:"000","JGT":"001","JEQ":"010","JGE":"011","JLT":"100","JNE":"101","JLE":"110","JMP":"111"}
def clean(l): return l.split("//")[0].strip().replace(" ","")
symbols = {"SP":0,"LCL":1,"ARG":2,"THIS":3,"THAT":4,"SCREEN":16384,"KBD":24576,**{f"R{i}":i for i in range(16)}}
rom = 0
with open(sys.argv[1], encoding="utf-8") as f:
    for l in f:
        c = clean(l)
        if c:
            if c.startswith("("): symbols[c[1:-1]] = rom
            else: rom += 1
ram = 16
out = os.path.splitext(sys.argv[1])[0] + "_my.hack"
with open(sys.argv[1], encoding="utf-8") as fi, open(out, "w", encoding="utf-8") as fo:
    for l in fi:
        c = clean(l)
        if not c or c.startswith("("): continue
        if c.startswith("@"):
            s = c[1:]
            if s.isdigit(): a = int(s)
            else:
                if s not in symbols: symbols[s] = ram; ram += 1
                a = symbols[s]
            fo.write(f"0{a:015b}\n")
        else:
            d = c.split("=")[0] if "=" in c else None
            c2 = c.split("=")[1] if "=" in c else c
            cp, j = c2.split(";") if ";" in c2 else (c2, None)
            fo.write(f"111{COMP[cp]}{DEST[d]}{JUMP[j]}\n")
print("完成輸出新檔案:", out)
