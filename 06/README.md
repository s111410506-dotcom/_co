# 專案 06：Assembler（組譯器）

本資料夾是 Nand2Tetris 課程的專案 6，實作 Hack 平台的**組譯器（Assembler）**與**反組譯器（Disassembler）**。

組譯器負責將 Hack 組合語言（`.asm`）轉換成 16 位元的機器碼（`.hack`）；反組譯器則將機器碼還原成組合語言，用來檢查組譯結果是否正確。

## 資料夾結構

```text
06/
├── add/
│   ├── Add.asm                  # 原始組合語言
│   ├── Add.hack                 # 16 位元機器碼
│   ├── Add_disassembled.asm     # 反組譯結果
│   └── Disassembler.py          # 反組譯器
├── max/
│   ├── Max.asm / Max.hack
│   ├── MaxL.asm / MaxL.hack
│   ├── MaxL_disassembled.asm
│   └── Disassembler.py
├── rect/
│   ├── Rect.asm / Rect.hack
│   ├── RectL.asm / RectL.hack
│   ├── RectL_disassembled.asm
│   └── Disassembler.py
└── pong/
    ├── Assembler.py             # 組譯器
    ├── Pong.asm / Pong.hack
    ├── PongL.asm / PongL.hack
    └── PongL_my.hack            # Assembler.py 的輸出
```

### 檔名說明

| 檔名 | 說明 |
|------|------|
| `.asm` | Hack 組合語言原始檔 |
| `.hack` | 組譯後的 16 位元機器碼，每行一個指令 |
| `*L.asm` | 不含符號（label／variable）的版本，用來測試基本組譯器 |
| `*_my.hack` | 由本專案 `Assembler.py` 產生的機器碼 |
| `*_disassembled.asm` | 由反組譯器產生的組合語言 |

## 使用方式

需要 Python 3，不需要安裝額外套件。

### 組譯（Assembler）

在 `06/add` 資料夾執行：

```bash
python ../pong/Assembler.py Add.asm
```

輸出檔名會是 `Add_my.hack`。其他程式同理：

```bash
cd 06/max
python ../pong/Assembler.py Max.asm
python ../pong/Assembler.py MaxL.asm

cd 06/rect
python ../pong/Assembler.py Rect.asm
python ../pong/Assembler.py RectL.asm

cd 06/pong
python Assembler.py PongL.asm
```

### 反組譯（Disassembler）

在各資料夾內執行：

```bash
cd 06/add
python Disassembler.py Add.hack

cd 06/max
python Disassembler.py Max.hack

cd 06/rect
python Disassembler.py Rect.hack
```

輸出檔名會是 `<原檔名>_disassembled.asm`。

## 實作說明

### 組譯器 `pong/Assembler.py`

採用兩遍掃描（two-pass）：

1. **第一遍**：移除註解與空白，記錄每個 `(LABEL)` 對應的 ROM 位址。
2. **第二遍**：逐行產生機器碼；遇到未定義的變數時，從 `RAM[16]` 開始依序配置位址。

支援的符號：

- 預定義符號：`SP=0`、`LCL=1`、`ARG=2`、`THIS=3`、`THAT=4`
- `R0`～`R15`
- `SCREEN=16384`、`KBD=24576`
- 使用者自訂的標籤與變數

指令編碼：

- **A 指令**：`0` + 15 位元位址
- **C 指令**：`111` + `comp`（7 位元）+ `dest`（3 位元）+ `jump`（3 位元）

另外支援 `MD`／`DM`、`AMD`／`ADM` 等 dest 別名。

### 反組譯器 `Disassembler.py`

- 依每行開頭的位元判斷是 A 指令或 C 指令。
- A 指令：將後 15 位元轉回十進位，輸出 `@value`。
- C 指令：利用 `a` 位元區分 `A`／`D` 與 `M` 記憶體運算，再反查 `comp`、`dest`、`jump` 對照表。
- 將結果輸出成可直接閱讀的 `.asm` 檔。

## 測試結果

| 測試程式 | 指令數 | 結果 |
|----------|-------:|------|
| `Add.asm` | 6 | 與 `Add.hack` 一致 |
| `Max.asm` / `MaxL.asm` | 16 | 與 `Max.hack` / `MaxL.hack` 一致 |
| `Rect.asm` / `RectL.asm` | 25 | 與 `Rect.hack` / `RectL.hack` 一致 |
| `Pong.asm` / `PongL.asm` | 27,483 | 成功產出 `PongL_my.hack` |

> 備註：資料夾內附的 `Pong.hack`、`PongL.hack` 與 `Assembler.py` 產生的 `PongL_my.hack` 在部分 `comp` 編碼上不同。本組譯器採用標準 Hack `comp` 對照表，因此以 `PongL_my.hack` 作為目前組譯器的輸出結果。

## 參考資料

- [Nand2Tetris Project 06](https://www.nand2tetris.org/project06)
- 《The Elements of Computing Systems》第 6 章
