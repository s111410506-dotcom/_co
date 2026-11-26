# Project 11 — Jack 編譯器：內容與實作報告

本目錄是 Nand2Tetris Project 11 的作業成果：以 JavaScript 實作 Jack 高階語言編譯器，將 `.jack` 原始碼直接翻譯成 Project 8 定義的 VM 中介碼（`.vm`）。

| 項目 | 內容 |
|------|------|
| 專案 | Project 11 — Jack Compiler |
| 實作語言 | JavaScript（Node.js，CommonJS 模組） |
| parser 形式 | 遞下降（recursive descent） |
| 輸出 | VM 指令（`.vm`），可直接交給 VM Emulator 執行 |
| 檔案組成 | 5 個編譯器模組、11 個 `.jack` 測試程式、11 個對應 `.vm` 輸出 |
| 驗證環境 | Node.js v24.21.0 |
| 驗證結果 | 重新編譯 11 個 `.jack`，產生的 `.vm` 與既有檔案 SHA-256 全部一致 |

---

## 一、目錄結構

```text
11/
├── README.md                   本報告
├── Compiler/                   編譯器實作
│   ├── JackCompiler.js         命令列入口
│   ├── JackTokenizer.js        詞法分析
│   ├── SymbolTable.js          符號表
│   ├── VMWriter.js             VM 指令輸出
│   └── CompilationEngine.js    語法分析與程式碼產生
├── Average/                    Main.jack / Main.vm
├── ComplexArrays/              Main.jack / Main.vm
├── ConvertToBin/               Main.jack / Main.vm
├── Seven/                      Main.jack / Main.vm
├── Square/                     Main.jack / Main.vm、Square.jack / Square.vm、SquareGame.jack / SquareGame.vm
└── Pong/                       Main.jack / Main.vm、Ball.jack / Ball.vm、Bat.jack / Bat.vm、PongGame.jack / PongGame.vm
```

`.DS_Store` 為 macOS 自動產生的資料夾中繼檔，與作業功能無關。

---

## 二、編譯器架構

編譯流程為四個階段，輸入只有一個 Jack 檔或一個包含 `.jack` 的資料夾：

```text
.jack 原始碼
   │
   ▼
JackTokenizer  →  token 串列（keyword / symbol / identifier / integerConstant / stringConstant）
   │
   ▼
CompilationEngine  →  遞下降解析 + 查 SymbolTable + 呼叫 VMWriter
   │
   ▼
VMWriter  →  <同源檔名>.vm
```

| 模組 | 職責 | 主要項目 |
|------|------|----------|
| `JackCompiler.js` | 命令列入口 | 接受檔案路徑或資料夾；資料夾內所有 `.jack` 逐一編譯；輸出到同一目錄下同名 `.vm`；路徑不存在或類型錯誤時結束程式 |
| `JackTokenizer.js` | 詞法分析 | 一次讀入整個檔案並預先切成 token 陣列；處理空白、`//` 與 `/* ... */` 註解、符號、字串、整數、識別字與關鍵字；提供 `advance()` / `peek()` / `tokenType()` 等介面 |
| `SymbolTable.js` | 符號表 | 以兩個 `Map` 分別維護 class scope（static、field）與 subroutine scope（argument、var）；`startSubroutine()` 清空區域作用域並重設索引；提供 `define()`、`varCount()`、`kindOf()`、`typeOf()`、`indexOf()` |
| `VMWriter.js` | 輸出層 | 收集 `push`、`pop`、`add` 等 VM 指令到陣列，`close()` 時一次寫入檔案 |
| `CompilationEngine.js` | 語法分析與程式碼產生 | 實作 Jack 文法：`class`、`classVarDec`、`subroutine`、`parameterList`、`varDec`、`statements`、`let`、`if`、`while`、`do`、`return`、`expression`、`term`、`subroutineCall`、`expressionList`；以 `eat(expected)` 做 token 驗證 |

### 符號表到 VM 記憶體區段的對應

| Jack 宣告種類 | VM segment | 索引方式 |
|---------------|------------|----------|
| `static` | `static` | class scope 獨立計數 |
| `field` | `this` | class scope 獨立計數 |
| `argument` | `argument` | subroutine scope 計數；method 的 `this` 固定為 argument 0 |
| `var` | `local` | subroutine scope 計數，並作為 `function` 的 `nLocals` |

---

## 三、語法結構到 VM 指令的轉換

| Jack 結構 | 產生的 VM 程式碼 |
|-----------|------------------|
| `constructor` | `push constant <field 數>` → `call Memory.alloc 1` → `pop pointer 0` |
| `method` | `push argument 0` → `pop pointer 0`（把 implicit `this` 設入 `THIS`） |
| `function` | `function ClassName.name <區域變數數>`，無額外前置指令 |
| `let x = e;` | `compileExpression(e)` → `pop <segment> <index>` |
| `let a[i] = e;` | 先算 `a + i` 得到目標位址，算完 `e` 後 `pop temp 0` → `pop pointer 1` → `push temp 0` → `pop that 0` |
| `a[i]`（讀取） | `push <segment> <index>` → `add` → `pop pointer 1` → `push that 0` |
| `if (c) { A } else { B }` | `not` → `if-goto IF_ELSE_n` → `[A]` → `goto IF_END_n` → `label IF_ELSE_n` → `[B]` → `label IF_END_n` |
| `while (c) { A }` | `label WHILE_EXP_n` → `[c]` → `not` → `if-goto WHILE_END_n` → `[A]` → `goto WHILE_EXP_n` → `label WHILE_END_n` |
| `do f(...);` | 先產生呼叫，再 `pop temp 0` 丟棄回傳值 |
| `return;`（無值） | `push constant 0` → `return` |
| `return e;` | `[e]` → `return` |
| `x.f(...)`（物件方法） | `push <物件所在 segment> <index>` 作為 `this`，呼叫 `Type.f`，引數個數 +1 |
| `C.f(...)`（類別函式） | 直接呼叫 `C.f`，不額外 push `this` |
| `f(...)`（同類別呼叫） | `push pointer 0` 後呼叫 `ClassName.f`，引數個數 +1 |
| 整數 / 字串 | 整數：`push constant n`；字串：`String.new` + 逐字元 `String.appendChar` |
| `true` / `false` / `null` / `this` | `0 not` / `0` / `0` / `push pointer 0` |
| `+ - & | < > =` 與 `- ~` | 對應 `add sub and or lt gt eq neg not` |
| `*` / `/` | `call Math.multiply 2` / `call Math.divide 2` |

控制流程標籤由 `labelCounter` 統一編號（`IF_ELSE_0`、`WHILE_EXP_1`…），避免同名衝突。

---

## 四、測試程式與覆蓋範圍

| 目錄 | 類別 | 主要功能 | 驗證到的編譯器能力 |
|------|------|----------|--------------------|
| `Average/` | `Main` | 讀入 n 個數字並輸出整數平均 | 變數宣告、`while`、`Array.new`、陣列讀寫、`sum / length`、Output 呼叫 |
| `ComplexArrays/` | `Main` | 巢狀陣列運算並印出預期/實際結果 | 複雜陣列索引 `b[a[3]]`、`a[b[a[3]]]`、多引數函式呼叫、遞迴式設計、`null` 比較與指定 |
| `ConvertToBin/` | `Main` | 將 `RAM[8000]` 的 16 位元值拆成 `RAM[8001..8016]` | `Memory.peek/poke`、位元運算 `&`、`~` 與比較、`function` 多函式呼叫、`fillMemory` 迴圈 |
| `Seven/` | `Main` | 印出 `1 + (2 * 3)` 的結果 | 算術運算、括號優先順序、`Math.multiply`、Output 呼叫 |
| `Square/` | `Main`、`Square`、`SquareGame` | 可用方向鍵移動、以 `z`/`x` 改變大小、`q` 結束的小程式 | 類別/建構子/方法/解構、`field`、物件方法呼叫、螢幕繪製、鍵盤輸入 |
| `Pong/` | `Main`、`Ball`、`Bat`、`PongGame` | 完整 Pong 遊戲，球反彈得分後球拍變窄 | `static` 單例、多類別互動、物件狀態、複雜布林與比較運算、計分輸出 |

共 11 個 `.jack` 原始檔，以及編譯產生的 11 個 `.vm` 檔，逐一放在同名目錄下，方便直接用 VM Emulator 載入測試。

---

## 五、驗證方式

在 repo 根目錄執行（以其中一個目錄為例）：

```powershell
node 11/Compiler/JackCompiler.js 11/Average
# 輸出: Compiled: Main.jack -> Main.vm
```

也可編譯單一檔案：

```powershell
node 11/Compiler/JackCompiler.js 11/Square/Square.jack
```

本次驗證將 `11/` 複製到暫存目錄後對六個測試目錄全部重新編譯，避免覆蓋 repo 內的成果，然後逐一比對：

- 11 個 `.vm` 全部成功產生，編譯過程無錯誤。
- 11 個輸出與 `11/` 內原有 `.vm` 的 SHA-256 完全相同（內容逐位元組一致）。
- 測試環境：Node.js v24.21.0。

---

## 六、設計特點與限制

**設計特點**

- Tokenizer 預先將整個檔案轉成 token 陣列，因此 `peek()` 可以一次看下一個 token，用來區分陣列索引、函式呼叫與普通變數。
- CompilationEngine 以 `eat(expected)` 統一做 token 消費與驗證，遇到不符合文法的 token 會直接拋出錯誤位置訊息。
- 輸出層與語法分析分離：VMWriter 只負責累積指令，未來若要改成 XML 或其他輸出格式，只需替換此模組。
- 符號表先完成區域變數宣告才寫入 `function ... nLocals`，因此 local 數量計算正確。

**限制**

- 此版本直接產生 VM 程式碼，沒有輸出 Project 10 的 XML 剖析樹；若需要檢查語法樹，須另行處理。
- Tokenizer 在讀取字串時未處理跳脫字元，遇到未閉合字串或註解不會主動報錯。
- 編譯器不會檢查型別相容性（例如把 `int` 指定給物件），這符合 Jack 語言的簡化設計。
- 執行時期行為仍仰賴 Nand2Tetris 提供的 OS 程式庫（`Math`、`String`、`Memory`、`Screen`、`Output`、`Keyboard`、`Sys`）與 VM Emulator。
