# 專案 08：VM Translator（虛擬機翻譯器，Part II）

本資料夾是 Nand2Tetris 課程專案 8 的**測試程式、測試腳本與轉譯結果**，用來驗證 VM 翻譯器是否正確支援**程式流程控制**與**函式呼叫**。

相較於 [專案 07](../07/)，專案 8 新增的 VM 指令有：

- **程式流程（Program Flow）**：`label`、`goto`、`if-goto`
- **函式呼叫（Function Calls）**：`function`、`call`、`return`
- **啟動程式碼（Bootstrap）**：設定 `SP = 256`，然後呼叫 `Sys.init`

對應的翻譯器實作位於上一層的 [`VMTranslator/`](../VMTranslator/)（`Main.js`、`Parser.js`、`CodeWriter.js`，Node.js）。

## 資料夾結構

```text
08/
├── ProgramFlow/
│   ├── BasicLoop/              # 用迴圈計算 1 + 2 + ... + n
│   │   ├── BasicLoop.vm
│   │   ├── BasicLoop.asm
│   │   ├── BasicLoop.tst / BasicLoopVME.tst
│   │   └── BasicLoop.out / BasicLoop.cmp
│   └── FibonacciSeries/        # 用 goto / if-goto 產生費氏數列
│       └── FibonacciSeries.vm / .asm / .tst / FibonacciSeriesVME.tst / .out / .cmp
└── FunctionCalls/
    ├── SimpleFunction/         # 單一函式：定義、初始化區域變數、return
    │   ├── SimpleFunction.vm
    │   ├── SimpleFunction.asm
    │   ├── SimpleFunction.tst / SimpleFunctionVME.tst
    │   └── SimpleFunction.out / SimpleFunction.cmp
    ├── NestedCall/             # 多層函式呼叫，檢查堆疊框架與暫存器還原
    │   ├── Sys.vm
    │   ├── NestedCall.asm
    │   ├── NestedCall.tst / NestedCallVME.tst
    │   ├── NestedCall.out / NestedCall.cmp
    │   ├── NestedCall.html          # 測試說明（呼叫慣例）
    │   └── NestedCallStack.html     # 堆疊框架圖解
    ├── FibonacciElement/       # 遞迴呼叫 + 多檔案（Sys.vm、Main.vm）
    │   ├── Sys.vm / Main.vm
    │   ├── FibonacciElement.asm
    │   ├── FibonacciElement.tst / FibonacciElementVME.tst
    │   └── FibonacciElement.out / FibonacciElement.cmp
    └── StaticsTest/            # 多檔案的 static 變數是否互相獨立
        ├── Sys.vm / Class1.vm / Class2.vm
        ├── StaticsTest.asm
        ├── StaticsTest.tst / StaticsTestVME.tst
        └── StaticsTest.out / StaticsTest.cmp
```

### 檔名說明

| 檔案 | 說明 |
|------|------|
| `.vm` | VM 語言原始檔。含 `Sys.vm` 的資料夾代表完整程式，由 bootstrap 呼叫 `Sys.init`。 |
| `.asm` | 翻譯後的 Hack 組合語言，保留 `// 指令` 註解方便對照。 |
| `*VME.tst` | 給 **VM Simulator** 的測試腳本，用 `vmstep` 逐步執行 VM 指令。 |
| `.tst` | 給 **CPU Emulator** 的測試腳本，載入 `.asm` 並以 `ticktock` 執行。 |
| `.cmp` | 預期輸出（比較基準）。 |
| `.out` | 實際輸出結果，可與 `.cmp` 比對。 |
| `.html` | Nand2Tetris 附的說明文件，圖文解釋 `NestedCall` 的呼叫慣例與堆疊框架。 |

## 測試程式

| 測試 | 資料夾 | 測試內容 | 預期結果 |
|------|--------|----------|----------|
| BasicLoop | `ProgramFlow/BasicLoop` | `label` / `if-goto` 組成迴圈，`argument[0] = 3` 時求和。 | `RAM[256] = 6` |
| FibonacciSeries | `ProgramFlow/FibonacciSeries` | `goto` / `if-goto` 搭配 `that` 寫出前 6 個費氏數。 | `RAM[3000..3005] = 0,1,1,2,3,5` |
| SimpleFunction | `FunctionCalls/SimpleFunction` | `function ... 2` 是否將 local 初始化為 0，以及 `return` 是否正確回傳並還原 SPR／LCL／ARG／THIS／THAT。 | 回傳值 `RAM[310] = 1196` |
| NestedCall | `FunctionCalls/NestedCall` | `Sys.init → Sys.main → Sys.add12` 的巢狀呼叫、THIS/THAT 儲存還原、return address。 | `RAM[5] = 135`、`RAM[6] = 246` |
| FibonacciElement | `FunctionCalls/FibonacciElement` | 遞迴 `Main.fibonacci(4)`，並測試 bootstrap 自動呼叫 `Sys.init`。 | `RAM[261] = 3` |
| StaticsTest | `FunctionCalls/StaticsTest` | `Class1.vm` 與 `Class2.vm` 都使用 `static 0/1`，檢查是否各自獨立。 | `RAM[261] = -2`、`RAM[262] = 8` |

> `NestedCall/` 內的兩個 HTML 檔案是官方提供的測試說明，直接用瀏覽器開啟即可查看堆疊框架示意圖。

## 使用方式

### 1. 轉譯 VM → ASM

翻譯器接受**單一 `.vm` 檔**或**整個資料夾**；只有在轉譯資料夾時才會加入 bootstrap。

有 `Sys.vm` 的測試請轉譯整個資料夾（輸出 `<資料夾名稱>.asm`）：

```bash
node VMTranslator/Main.js 08/FunctionCalls/NestedCall
node VMTranslator/Main.js 08/FunctionCalls/FibonacciElement
node VMTranslator/Main.js 08/FunctionCalls/StaticsTest
```

沒有 `Sys.init` 的測試請轉譯單一 `.vm` 檔（不加入 bootstrap，測試腳本會自行設定堆疊與基底指標）：

```bash
node VMTranslator/Main.js 08/ProgramFlow/BasicLoop/BasicLoop.vm
node VMTranslator/Main.js 08/ProgramFlow/FibonacciSeries/FibonacciSeries.vm
node VMTranslator/Main.js 08/FunctionCalls/SimpleFunction/SimpleFunction.vm
```

### 2. 用 VM Simulator 測試

開啟各資料夾的 `<名稱>VME.tst`，會逐步執行 VM 指令並與 `.cmp` 比對。

### 3. 用 CPU Emulator 測試

開啟各資料夾的 `<名稱>.tst`，載入轉譯後的 `.asm`，執行完畢後與 `.cmp` 比對並產生 `.out`。

## 翻譯器實作重點（`VMTranslator/CodeWriter.js`）

- **標籤範圍**：函式內的標籤會轉成 `FunctionName$label`，避免不同函式的同名標籤衝突。
- **`function f n`**：產生 `(f)` 標籤，並 push `n` 個 0 作為區域變數。
- **`call f n`**：依序 push 回傳位址、LCL、ARG、THIS、THAT，設定 `ARG = SP - 5 - n`、`LCL = SP`，再跳到 `f`。回傳位址使用 `functionName$ret.<計數>` 產生，確保每次呼叫不同。
- **`return`**：用 `LCL` 當框架指標（暫存於 `R13`），從 `frame - 5` 取出回傳位址（暫存於 `R14`），把回傳值寫入 `*ARG`，`SP = ARG + 1`，再依序還原 THAT／THIS／ARG／LCL，最後跳回回傳位址。
- **`writeInit()`**：`SP = 256` 後呼叫 `Sys.init 0`，讓完整程式能自動開始執行。

## 參考資料

- [Nand2Tetris Project 08](https://www.nand2tetris.org/project08)
- 《The Elements of Computing Systems》第 8 章
