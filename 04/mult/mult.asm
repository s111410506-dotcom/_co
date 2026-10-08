// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)

    // 1. 初始化：將存放結果的 R2 歸零
    @R2
    M=0

    // 2. 設定迴圈計數器：將 R1 的值存入變數 i
    @R1
    D=M
    @i
    M=D

(LOOP)
    // 3. 終止條件判斷：如果計數器 i <= 0，結束迴圈
    @i
    D=M
    @END
    D;JLE       // JLE (Jump if Less than or Equal to 0) 能同時防止 R1 一開始就是 0 的狀況

    // 4. 執行累加：R2 = R2 + R0
    @R0
    D=M
    @R2
    M=D+M

    // 5. 計數器遞減：i = i - 1
    @i
    M=M-1

    // 6. 跳回迴圈開頭繼續執行
    @LOOP
    0;JMP

(END)
    // 7. 程式結束：Hack 組合語言的標準無窮迴圈寫法
    @END
    0;JMP