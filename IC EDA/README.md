# IC 設計的 EDA 是什麼？

EDA（Electronic Design Automation，電子設計自動化）是指一套用於設計、模擬、驗證與實作電子系統（尤其是積體電路，IC）的軟體工具與方法。簡單來說，EDA 就是「用電腦輔助工程師設計晶片」的技術。

一顆現代 IC 動輒包含數十億個電晶體，無法靠人工繪製或驗證。EDA 工具讓工程師以程式化、自動化的方式完成從概念到實體晶片的流程，大幅降低錯誤率並縮短開發時間。

## EDA 在 IC 設計流程中的角色

IC 設計大致可分為前端（Front-End）與後端（Back-End）兩大階段，EDA 貫穿其中：

| 階段 | 工作內容 | 常見 EDA 工具類型 |
| --- | --- | --- |
| 設計輸入 | 以 HDL（Verilog / VHDL）描述電路功能 | 編輯器、IDE |
| 功能模擬 | 驗證 RTL 行為是否符合規格 | Simulator（如 ModelSim、VCS） |
| 邏輯合成 | 將 RTL 轉換為閘級網表（Netlist） | Synthesis（如 Design Compiler） |
| 驗證與測試 | 形式驗證、時序分析、DFT、功耗分析 | Formal、STA、DFT 工具 |
| 實體設計 | 佈局佈線（Place & Route）、DRC/LVS | P&R（如 Innovus、ICC2） |
| 簽核 | 時序、功耗、雜訊、良率等最終檢查 | Sign-off 工具 |

## 為什麼 EDA 重要？

- **規模**：數十億電晶體的設計必須自動化處理。
- **正確性**：晶片一旦投片（Tape-out）就難以修改，事前驗證至關重要。
- **效率**：自動化流程讓設計週期從數月縮短到可管理的範圍。
- **最佳化**：在面積、速度、功耗（PPA）之間找到最佳平衡。

## 常見 EDA 廠商

- **Synopsys**
- **Cadence**
- **Siemens EDA（原 Mentor Graphics）**
- 開源工具：**Yosys**、**OpenROAD**、**Magic VLSI** 等

## 小結

EDA 是連接「電路設計想法」與「實際晶片」的橋樑。它結合了電子工程、電腦科學與演算法，是現代半導體產業不可或缺的核心技術。
