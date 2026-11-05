# 計算機結構期中專案報告：Nand2Tetris 01～05

| 項目 | 內容 |
|---|---|
| 課程 | 計算機結構 |
| 學校 | 金門大學資訊工程系 |
| 學生 | 陳宇霆 |
| 學號 | 111410506 |
| 報告範圍 | `01`～`05`（布林邏輯、算術晶片、循序邏輯、機器語言、電腦架構） |
| 工具 | Nand2Tetris Hardware Simulator、Hack Assembly |

---

## 一、摘要

本報告整理 Nand2Tetris 專案 01～05 的實作成果與學習心得。這五個專案由最基礎的 NAND 閘出發，依序建立布林邏輯、算術邏輯、暫存器與記憶體、Hack 組合語言，最後組出一個可以執行機器碼的 Hack 電腦。

整體成果如下：

- `01`：完成 15 個組合邏輯晶片，15/15 通過測試。
- `02`：完成 5 個算術晶片，包含 16 位元加法器、遞增器與 ALU，5/5 通過測試。
- `03`：完成 8 個循序邏輯晶片，包含 Bit、Register、RAM 階層與 PC，8/8 通過測試。
- `04`：完成 `mult.asm` 與 `fill.asm` 兩個 Hack 組合語言程式。
- `05`：完成 `CPU`、`Memory`、`Computer` 三個核心晶片，並通過 CPU 與 Computer 的自動化整合測試；Memory 的輸出檔也與標準答案一致。

最大的收穫是理解「抽象層層堆疊」的過程：每一個新晶片都只使用前一層已驗證過的零件，從 NAND 到 ALU、RAM、CPU，最後真的能跑程式。這種由下而上的設計方式，讓複雜系統可以被拆解成許多可獨立測試的小問題。

---

## 二、專案總覽

| 專案 | 主題 | 主要檔案 | 測試結果 |
|---|---|---|---|
| `01` | 布林邏輯 | `Not`、`And`、`Or`、`Xor`、`Mux`、`DMux`、16 位元與多路版本等 15 個 `.hdl` | 15/15 通過 |
| `02` | 算術邏輯 | `HalfAdder`、`FullAdder`、`Add16`、`Inc16`、`ALU` | 5/5 通過 |
| `03` | 循序邏輯 | `Bit`、`Register`、`RAM8/64/512/4K/16K`、`PC` | 8/8 通過 |
| `04` | 機器語言 | `mult.asm`、`fill.asm` | Mult 6/6 組測資通過；Fill 三階段測試通過 |
| `05` | 電腦架構 | `CPU.hdl`、`Memory.hdl`、`Computer.hdl`、`Add/Max/Rect.hack` | 8 個自動化測試腳本全數通過；Memory 以 `.out` / `.cmp` 比對一致 |

> 測試方式是使用 Hardware Simulator 載入 `.tst` 腳本，將執行結果 `.out` 與標準答案 `.cmp` 比對。`05/CPU` 的 `.cmp` 中部分 `outM` 欄位以 `*******` 表示「不檢查」，因此 `.out` 雖有實際數值，仍視為通過。
>
> `05/Memory.tst` 後段包含等待鍵盤輸入的 `while out <> 89` 迴圈，必須在 GUI 中實際按住按鍵才能完成，因此本次以既有的 `Memory.out` 與 `Memory.cmp` 逐行比對，確認兩者一致。其餘可自動執行的測試已於 2026/11/05 重新跑過一次。

---

## 三、各專案成果

### 3.1 專案 01：布林邏輯

#### 完成內容

以 `Nand` 為唯一基礎閘，實作下列 15 個晶片：

- 基礎閘：`Not`、`And`、`Or`、`Xor`
- 多工與解多工：`Mux`、`DMux`、`Mux16`、`Mux4Way16`、`Mux8Way16`、`DMux4Way`、`DMux8Way`
- 16 位元與多位元輸入：`Not16`、`And16`、`Or16`、`Or8Way`

#### 設計重點

1. **以 NAND 建構所有邏輯**
   - `Not(a) = Nand(a, a)`
   - `And(a, b) = Not(Nand(a, b))`
   - `Or(a, b) = Nand(Not(a), Not(b))`
   - `Xor(a, b) = (a AND NOT b) OR (NOT a AND b)`

2. **Mux 的「選擇」概念**
   - 先用 `Not` 產生 `notSel`。
   - 以 `And(a, notSel)` 與 `And(b, sel)` 分別遮蔽沒有被選到的輸入。
   - 最後用 `Or` 合併，即：
     `out = (a AND NOT sel) OR (b AND sel)`。

3. **多路晶片採用階層式設計**
   - `Mux4Way16` 先以 `sel[0]` 選出 AB 組與 CD 組，再用 `sel[1]` 做最後二選一。
   - `Mux8Way16` 先拆成兩組 `Mux4Way16`，最後用 `sel[2]` 選擇前四或後四。
   - `DMux4Way`、`DMux8Way` 則用反向的樹狀分送方式實作。

4. **16 位元晶片採用逐位展開**
   - `Not16`、`And16`、`Or16`、`Mux16` 都是將 16 個單一位元電路並排。
   - 這種寫法雖然較長，但與硬體「每位元平行處理」的觀念一致。

#### 成果

15 個晶片的 `.out` 與 `.cmp` 全部一致。透過這個專案，我建立了「任何布林函式都可以用 NAND 組合出來」的直覺，也熟悉了 HDL 的匯流排切片語法，例如 `a[0..7]`、`out[15]`。

---

### 3.2 專案 02：算術邏輯

#### 完成內容

- `HalfAdder`：兩個位元相加，產生 `sum` 與 `carry`。
- `FullAdder`：三個位元相加，使用兩個 HalfAdder 與一個 Or。
- `Add16`：16 位元漣波進位加法器。
- `Inc16`：將輸入加 1。
- `ALU`：依 `zx、nx、zy、ny、f、no` 六個控制位計算 18 種算術/邏輯運算，並輸出 `zr`、`ng`。

#### 設計重點

1. **HalfAdder 與 FullAdder**
   - HalfAdder：
     - `sum = Xor(a, b)`
     - `carry = And(a, b)`
   - FullAdder 先算 `a + b`，再把結果與 `c` 相加，兩個進位用 `Or` 合併。

2. **Add16 的漣波進位**
   - 最低位使用 HalfAdder。
   - 第 1～14 位使用 FullAdder，將前一位的 carry 往後傳。
   - 最高位只取 `sum`，依規格忽略最後的進位。
   - 這樣的設計簡單且正確，缺點是進位需要逐位傳遞，延遲較高。

3. **Inc16 重用 Add16**
   - 將 `b[0]` 設為 `true`，其餘位元設為 `false`，即等同於加 1：
     ```hdl
     Add16(a=in, b[0]=true, b[1..15]=false, out=out);
     ```

4. **ALU 的控制流程**
   - 依照 `zx → nx → zy → ny → f → no` 的順序處理：
     1. `zx`、`zy` 可將 X、Y 歸零。
     2. `nx`、`ny` 可將 X、Y 取補數。
     3. `f` 選擇加法或 AND。
     4. `no` 將最後結果取補數。
   - `ng` 直接取輸出最高位 `out[15]`，因為二補數的最高位就是符號位。
   - `zr` 將輸出拆成高低各 8 位，分別送入 `Or8Way`，再用 `Not` 判斷是否全為 0。

#### 成果

5 個晶片全部通過測試。ALU 是這個專案中最有挑戰性的一部分，因為它把多個多工器串接成一個「可程式化的運算單元」。完成後我更能理解 CPU 為什麼只需要一組 ALU，就能執行加法、減法、AND、OR、NOT 等各種指令。

---

### 3.3 專案 03：循序邏輯

#### 完成內容

- `Bit`：1 位元暫存器。
- `Register`：16 位元暫存器。
- `RAM8`、`RAM64`、`RAM512`、`RAM4K`、`RAM16K`：階層式記憶體。
- `PC`：具有 `reset`、`load`、`inc` 功能的 16 位元程式計數器。

#### 設計重點

1. **Bit：用 Mux 與 DFF 保存狀態**
   ```hdl
   Mux(a=outFb, b=in, sel=load, out=muxOut);
   DFF(in=muxOut, out=out, out=outFb);
   ```
   - `load = 0` 時，Mux 選擇目前輸出 `outFb`，形成回授，狀態保持不變。
   - `load = 1` 時，Mux 選擇新輸入 `in`，在下一個時脈寫入 DFF。
   - 這是「時序」與「組合邏輯」結合的關鍵範例。

2. **Register：16 個 Bit 並排**
   - 16 個 Bit 共用同一個 `load`，確保 16 位元同步更新。

3. **RAM 的階層式擴充**
   - `RAM8`：
     - 用 `DMux8Way` 將 `load` 分送到 8 個 Register。
     - 用 `Mux8Way16` 依 `address` 選出要讀取的 Register。
   - `RAM64`：以 `address[3..5]` 選 8 個 RAM8，`address[0..2]` 選 RAM8 內部的暫存器。
   - `RAM512`、`RAM4K`、`RAM16K` 依相同模式遞迴擴充。
   - 這種「低位址給小模組、高位址給大模組」的分工，是記憶體位址解碼的核心概念。

4. **PC 的優先權設計**
   - 規格優先順序為：`reset > load > inc > 保持不變`。
   - 先算 `Inc16`，再用三層 Mux 依序處理 `inc`、`load`、`reset`：
     ```hdl
     Mux16(a=outFb, b=incOut, sel=inc,   out=step1);
     Mux16(a=step1, b=in,     sel=load,  out=step2);
     Mux16(a=step2, b=false,  sel=reset, out=step3);
     Register(in=step3, load=true, out=out, out=outFb);
     ```
   - 因為 Mux 有優先順序，越後面的 Mux 優先權越高，剛好符合 `reset` 最高的要求。

#### 成果

8 個晶片全部通過測試。這個專案讓我第一次真正理解「時脈」與「狀態」：組合邏輯的輸出只取決於目前輸入，而循序邏輯會保留上一個時脈的狀態。RAM 的遞迴擴充也讓我看到硬體設計中「重複使用小模組」的力量。

---

### 3.4 專案 04：機器語言

#### 完成內容

1. `mult.asm`：計算 `RAM[2] = RAM[0] × RAM[1]`。
2. `fill.asm`：根據鍵盤狀態將整個螢幕填黑或填白。

#### `mult.asm` 設計

Hack 指令集沒有乘法指令，因此使用「重複加法」實作：

1. 將 `R2` 初始化為 0。
2. 將 `R1` 複製到計數器 `i`。
3. 每次迴圈執行 `R2 = R2 + R0`，並將 `i` 減 1。
4. 當 `i <= 0` 時結束。

核心片段：

```asm
(LOOP)
    @i
    D=M
    @END
    D;JLE        // i <= 0 時結束，可正確處理 R1 = 0

    @R0
    D=M
    @R2
    M=D+M        // R2 = R2 + R0

    @i
    M=M-1
    @LOOP
    0;JMP
```

使用 `JLE` 而不是 `JEQ`，可以避免 `R1 = 0` 時仍然進入迴圈的問題。

#### `fill.asm` 設計

1. 讀取鍵盤記憶體 `KBD`（位址 24576）。
2. 若 `KBD != 0`，代表有按鍵被按下，將顏色設為 `-1`（16 位元全為 1，黑色）。
3. 若 `KBD == 0`，將顏色設為 `0`（白色）。
4. 從 `SCREEN`（位址 16384）開始，逐一將顏色寫入螢幕記憶體，直到位址 24576 為止。
5. 完成一次填滿後回到主迴圈，持續偵測鍵盤狀態。

邊界條件是：螢幕記憶體範圍為 `16384`～`24575`，因此當指標等於 `24576` 時必須停止，避免覆寫到鍵盤記憶體。

#### 成果

- `mult.asm` 通過 6 組測試：`0×0`、`1×0`、`0×2`、`3×1`、`2×4`、`6×7`，結果分別為 `0、0、0、3、8、42`。
- `fill.asm` 通過自動化測試的三個階段：鍵盤未按時全白、按下時全黑、放開後恢復全白；互動測試也可正常運作。

這個專案讓我體會到「高階語言的一行乘法，在機器層其實是一段迴圈」。同時也理解了記憶體映射 I/O：只要對特定記憶體位址寫入，就能控制螢幕與讀取鍵盤。

---

### 3.5 專案 05：電腦架構

#### 完成內容

- `CPU.hdl`：指令解碼、A/D 暫存器、ALU 運算、記憶體寫入與跳躍控制。
- `Memory.hdl`：整合 RAM16K、Screen、Keyboard 的記憶體映射。
- `Computer.hdl`：連接 CPU、ROM32K 與 Memory，形成完整的 Hack 電腦。
- 測試程式：`Add.hack`、`Max.hack`、`Rect.hack`。

#### CPU 設計重點

1. **判斷 A 指令或 C 指令**
   - `instruction[15] = 0` 表示 A 指令。
   - `instruction[15] = 1` 表示 C 指令。

2. **A Register**
   - A 指令時，將 `instruction` 直接載入 A。
   - C 指令時，若 `dest` 包含 A（`instruction[5] = 1`），則載入 ALU 輸出。
   - A 的值同時輸出到 `addressM`，作為資料記憶體位址。

3. **D Register**
   - 當 C 指令的 `dest` 包含 D（`instruction[4] = 1`）時，將 ALU 輸出寫入 D。

4. **ALU 輸入**
   - `instruction[12]` 決定 ALU 的第二個輸入是 A 還是 M。
   - `instruction[6..11]` 直接接到 ALU 的六個控制位。

5. **記憶體寫入**
   - `writeM = instruction[15] AND instruction[3]`，只有 C 指令且 `dest` 包含 M 時才寫入。

6. **跳躍控制**
   - 先判斷 ALU 輸出是否為正：`pos = NOT(zr OR ng)`。
   - 再依 `instruction[0..2]` 分別判斷 `JGT`、`JEQ`、`JLT`。
   - 最後必須再 AND `instruction[15]`，確保 A 指令不會觸發跳躍。

   ```hdl
   Or(a=zr, b=ng, out=zrOrNg);
   Not(in=zrOrNg, out=pos);

   And(a=instruction[2], b=ng,  out=jlt);
   And(a=instruction[1], b=zr,  out=jeq);
   And(a=instruction[0], b=pos, out=jgt);
   ```

#### Memory 設計重點

- 使用 `address[13..14]` 解碼四個區段：
  - `00`、`01`：RAM16K
  - `10`：Screen
  - `11`：Keyboard
- 寫入時用 `DMux4Way` 將 `load` 導向正確的硬體。
- 讀取時用 `Mux4Way16` 從 RAM、Screen、Keyboard 中選出正確輸出。
- RAM16K 橫跨 `00` 與 `01` 兩個區段，因此兩個 `load` 訊號要先 OR 起來。

#### Computer 設計重點

- `ROM32K` 依 `pc` 輸出指令。
- `CPU` 接收指令、記憶體輸出 `inM` 與 `reset`，產生 `outM`、`writeM`、`addressM`、`pc`。
- `Memory` 依 `addressM` 讀寫資料，並將結果送回 CPU。
- 三者形成「取指 → 解碼 → 執行 → 寫回」的循環。

#### 成果

- `CPU` 與 `CPU-external` 測試通過，包含 A 指令、C 指令、ALU 運算、各種跳躍條件與 reset。
- `Memory` 的輸出檔與標準答案一致，涵蓋 RAM 上下半部、Screen 與 Keyboard 的位址解碼；鍵盤互動部分需在 GUI 中操作。
- `ComputerAdd`、`ComputerMax`、`ComputerRect` 及其 external 版本通過，證明 CPU、Memory、ROM 能正確協同運作。
- `Rect.hack` 能在螢幕左上角畫出 16 像素寬、4 像素高的矩形。

完成 `Computer.hdl` 後，看到自己做的 CPU 真的執行 `Add.hack`、`Max.hack`、`Rect.hack`，是整個專案中最有成就感的一刻。

---

## 四、測試結果整理

| 專案 | 測試項目 | 結果 |
|---|---|---|
| `01` | 15 個組合邏輯晶片 | 15/15 通過 |
| `02` | HalfAdder、FullAdder、Add16、Inc16、ALU | 5/5 通過 |
| `03` | Bit、Register、RAM8/64/512/4K/16K、PC | 8/8 通過 |
| `04` | Mult 六組測資 | 6/6 通過 |
| `04` | FillAutomatic 三階段（白/黑/白） | 通過 |
| `05` | CPU、CPU-external | 通過（`outM` 含 wildcard 欄位） |
| `05` | Memory | 通過（`Memory.out` 與 `Memory.cmp` 一致；鍵盤互動需 GUI） |
| `05` | ComputerAdd、ComputerMax、ComputerRect 與 external 版本 | 6/6 通過 |

---

## 五、心得與反思

### 5.1 從 NAND 到電腦：抽象的力量

這五個專案最核心的體驗，就是「 abstraction（抽象）」不只是課本上的名詞，而是真的可以一層一層蓋起來：

```text
NAND
  → Not / And / Or / Xor
  → Mux / DMux
  → HalfAdder / FullAdder / ALU
  → Bit / Register / RAM
  → CPU / Memory / Computer
  → Hack 機器碼與程式
```

每一層都只需要相信下一層是正確的，不需要在設計 CPU 時還去想 NAND 的電晶體怎麼運作。這讓我理解為什麼現代電腦可以如此複雜：因為工程師用抽象把複雜度隔離了。

### 5.2 測試比想像中重要

HDL 的錯誤常常不是「語法錯」，而是「邏輯對但接線錯」。例如：

- 匯流排切片範圍寫錯，可能只影響某幾個位元，表面上看起來還能跑。
- `Mux` 的 `sel` 接反，會讓結果在特定輸入下才出錯。
- RAM 的位址高低位切錯，會造成資料寫到錯誤位置。

Hardware Simulator 的 `.tst` / `.cmp` 比對機制幫了很大的忙。每次修改後重新跑測試，比盯著程式碼找錯有效得多。這也讓我體會到軟硬體開發都需要「可重現的測試」。

### 5.3 控制訊號的優先順序

`PC` 與 `CPU` 的跳躍邏輯讓我印象最深。硬體沒有「if-else」語法，但可以用 Mux 的串接來實現優先權：

- `PC`：`reset` 最高，其次 `load`，再來 `inc`。
- `CPU`：只有 C 指令才能跳躍，且必須同時符合 `JGT/JEQ/JLT` 的條件。

把「條件判斷」轉換成「控制訊號 + 多工器」的過程，是這個專案中最需要思考的部分。

### 5.4 記憶體映射 I/O 的巧妙

`fill.asm` 與 `Memory.hdl` 讓我理解到，螢幕與鍵盤並不是特殊的指令，而是被映射到特定的記憶體位址：

- `16384`～`24575`：螢幕
- `24576`：鍵盤

因此程式只要對記憶體寫入，就能畫圖；只要讀取記憶體，就能取得鍵盤狀態。這種設計簡化了指令集，也讓硬體與軟體的介面非常一致。

### 5.5 除錯過程中的收穫

在實作 `ALU` 時，最容易出錯的是 `zr` 與 `ng`：

- `ng` 必須取「最終輸出」的最高位，而不是 ALU 內部的中間值。
- `zr` 必須判斷 16 位元是否全為 0，不能只檢查部分位元。

在實作 `CPU` 時，跳躍條件也需要特別小心：

- `pos` 必須是 `NOT(zr OR ng)`，不能只寫 `NOT(ng)`，否則 `zr = 1` 時會被誤判為正數。
- A 指令不能觸發跳躍，因此最後要再 AND `instruction[15]`。

這些細節讓我學到：硬體設計的錯誤往往不是「完全不會動」，而是「大部分情況會動，但邊界條件出錯」。因此測試資料必須涵蓋 0、負數、最大值、進位等邊界情況。

### 5.6 對後續課程的期待

完成 01～05 後，我已經知道電腦最底層如何運作。接下來 06～13 會進入組譯器、VM、高階語言與作業系統，我期待把這台「自己做的電腦」一路接到可以執行進階程式，形成完整的軟硬體堆疊。

---

## 六、可改進之處

1. **註解編碼不一致**
   - 部分 `.hdl` 檔的中文註解因編輯器編碼問題變成亂碼。
   - 後續可統一改為 UTF-8，讓程式碼更易讀。

2. **補充自動化測試紀錄**
   - 目前多數測試是手動在 Hardware Simulator 執行。
   - 可加入腳本統一執行 `.tst`，並保存 `.out` 與 `.cmp` 的比對結果。

3. **增加測試邊界案例**
   - 例如 ALU 的溢位、RAM 的最大位址、PC 的連續跳躍等。
   - 雖然官方測試已涵蓋多數情況，但自行補充測試能更早發現問題。

4. **整理共用元件**
   - 16 位元與多路晶片有許多重複結構，未來可用程式生成 HDL，減少人工展開造成的錯誤。

---

## 七、結論

這次期中專案讓我從最基礎的 NAND 閘一路實作到完整的 Hack 電腦。成果不只是 30 多個晶片與兩個組合語言程式，更重要的是建立了一套「由下而上、分層驗證」的工程思維。

我學到：

- 如何把布林函式轉換成電路。
- 如何用進位鏈設計加法器與 ALU。
- 如何用時脈與回授保存狀態。
- 如何用記憶體映射控制 I/O。
- 如何解碼指令、控制資料流，並讓 CPU 執行機器碼。

最深刻的體會是：電腦並不是魔法，而是一層層抽象與無數個簡單開關組合而成的系統。只要每一層都正確，最後就能展現出複雜的行為。這也是我認為這個專案最有價值的地方。
