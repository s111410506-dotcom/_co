# 專案 07：VM Translator（虛擬機翻譯器，Part I）

本資料夾是 Nand2Tetris 課程專案 7 的**測試程式與測試腳本**，用來驗證 VM 翻譯器是否能把 VM 語言（`.vm`）正確轉譯成 Hack 組合語言（`.asm`）。

專案 7 的範圍只包含兩類 VM 指令：

- **堆疊運算（Stack Arithmetic）**：`push`、`pop` 與加減乘除、邏輯、比較運算。
- **記憶體存取（Memory Access）**：`local`、`argument`、`this`、`that`、`temp`、`static`、`pointer`、`constant` 等區段。

程式流程（label／goto／if-goto）與函式（function／call／return）屬於專案 8，不在這裡測試。

對應的翻譯器實作位於上一層的 [`VMTranslator/`](../VMTranslator/)（`Main.js`、`Parser.js`、`CodeWriter.js`，Node.js）。

## 資料夾結構

```text
07/
├── StackArithmetic/
│   ├── SimpleAdd/          # 常數相加（最簡單的範例）
│   │   ├── SimpleAdd.vm
│   │   ├── SimpleAdd.asm
│   │   ├── SimpleAdd.tst
│   │   ├── SimpleAddVME.tst
│   │   ├── SimpleAdd.out
│   │   └── SimpleAdd.cmp
│   └── StackTest/          # 完整的算術／邏輯／比較運算測試
│       └── StackTest.vm / .asm / .tst / StackTestVME.tst / .out / .cmp
└── MemoryAccess/
    ├── BasicTest/          # 各記憶體區段的 push / pop
    ├── PointerTest/        # pointer、this、that 的操作
    └── StaticTest/         # static 區段（依檔案名稱前綴變數）
        └── <名稱>.vm / .asm / .tst / <名稱>VME.tst / .out / .cmp
```

每個測試資料夾都包含同一組檔案，只是前置檔名不同。

### 檔名說明

| 檔案 | 說明 |
|------|------|
| `.vm` | VM 語言原始檔，也就是翻譯器的輸入。 |
| `.asm` | 翻譯後的 Hack 組合語言；檔案中保留 `// push constant 7` 這類註解，方便對照每一個 VM 指令。 |
| `*VME.tst` | 給 **VM Simulator** 使用的測試腳本：載入 `.vm`，用 `vmstep` 逐步執行，檢查堆疊結果。 |
| `.tst` | 給 **CPU Emulator** 使用的測試腳本：載入 `.asm`，用 `ticktock` 執行足夠的時脈後輸出 RAM。 |
| `.cmp` | 預期的正確輸出（compare-to 的比較基準）。 |
| `.out` | 測試程式實際輸出的結果檔，可與 `.cmp` 比對。 |

## 測試程式

| 測試 | 資料夾 | 測試內容 |
|------|--------|----------|
| SimpleAdd | `StackArithmetic/SimpleAdd` | `push constant 7`、`push constant 8`、`add`，結果應為 15。 |
| StackTest | `StackArithmetic/StackTest` | `eq`／`lt`／`gt`、`add`／`sub`／`neg`、`and`／`or`／`not` 等 38 個 VM 指令。 |
| BasicTest | `MemoryAccess/BasicTest` | 對 local、argument、this、that、temp 等區段做 push/pop 並運算。 |
| PointerTest | `MemoryAccess/PointerTest` | 透過 `pointer 0/1` 設定 THIS／THAT，再存取 `this`、`that`。 |
| StaticTest | `MemoryAccess/StaticTest` | 使用 `static 0~7`，驗證 static 變數會轉成以檔名為前綴的變數。 |

## 使用方式

### 1. 轉譯 VM → ASM

在專案根目錄執行（`node Main.js` 可接受單一 `.vm` 檔或整個資料夾）：

```bash
node VMTranslator/Main.js 07/StackArithmetic/SimpleAdd/SimpleAdd.vm
```

輸出會覆蓋同資料夾下的 `SimpleAdd.asm`。若要一次轉譯一個資料夾：

```bash
node VMTranslator/Main.js 07/StackArithmetic/StackTest
node VMTranslator/Main.js 07/MemoryAccess/BasicTest
node VMTranslator/Main.js 07/MemoryAccess/PointerTest
node VMTranslator/Main.js 07/MemoryAccess/StaticTest
```

> 注意：目前翻譯器在「轉譯資料夾」時才會加入 bootstrap 程式碼；轉譯單一 `.vm` 檔時不會。因此測試單一檔案時請使用原本的 `.tst`（不依賴 bootstrap 的版本）。

### 2. 用 VM Simulator 測試

在 Nand2Tetris 的 VM Simulator 中開啟各資料夾的 `<名稱>VME.tst`，程式會自動與 `.cmp` 比對。

### 3. 用 CPU Emulator 測試

在 CPU Emulator 中開啟各資料夾的 `<名稱>.tst`，它會載入轉譯完成的 `.asm`、執行後與 `.cmp` 比對，並寫出 `.out`。

## 參考資料

- [Nand2Tetris Project 07](https://www.nand2tetris.org/project07)
- 《The Elements of Computing Systems》第 7 章
