// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

(MAIN_LOOP)
    // 1. 偵測鍵盤輸入
    @KBD        // KBD 位址為 24576
    D=M         // 讀取鍵盤目前的數值
    
    @SET_BLACK
    D;JNE       // 如果 D != 0 (有按鍵被按下)，跳躍至 SET_BLACK

(SET_WHITE)
    @color
    M=0         // 將變數 color 設為 0 (全白)
    @FILL_SCREEN
    0;JMP       // 無條件跳躍至繪圖區段

(SET_BLACK)
    @color
    M=-1        // 將變數 color 設為 -1 (全黑，二進位為 1111111111111111)

(FILL_SCREEN)
    // 2. 初始化螢幕指標
    @SCREEN     // SCREEN 起始位址為 16384
    D=A
    @pointer
    M=D         // 將 pointer 變數設為 16384

(FILL_LOOP)
    // 3. 執行繪製 (將 color 的值寫入 pointer 指向的記憶體)
    @color
    D=M         // 取出目標顏色 (-1 或 0)
    
    @pointer
    A=M         // ✨關鍵：將 pointer 的「數值」(目前的螢幕位址) 載入 A 暫存器
    M=D         // 將顏色寫入該螢幕記憶體位址
    
    // 4. 指標遞增並檢查是否畫完
    @pointer
    M=M+1       // pointer = pointer + 1
    D=M         // 將更新後的 pointer 存入 D
    
    @24576      // 螢幕區塊的下一個位址剛好是 KBD (24576)
    D=D-A       // 計算: pointer - 24576
    
    @FILL_LOOP
    D;JLT       // 如果 D < 0 (代表 pointer 還沒到達 24576)，回到 FILL_LOOP 繼續畫
    
    // 5. 畫面更新完畢，回到主迴圈繼續監聽鍵盤
    @MAIN_LOOP
    0;JMP