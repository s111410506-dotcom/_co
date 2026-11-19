const fs = require('fs');
const { CommandType } = require('./Parser');

class CodeWriter {
    constructor(outputFilePath) {
        this.outputFilePath = outputFilePath;
        this.outputLines = [];
        this.fileName = '';
        this.currentFunction = ''; // 追蹤目前所在的函式名稱（用於產生 FunctionName$label）
        this.labelCounter = 0;
        this.callCounter = 0;  // 追蹤函式呼叫次數（用於產生唯一的 return address 標籤）
    }

    setFileName(fileName) {
        this.fileName = fileName;
    }

    // 寫入啟動程式碼 (僅在轉譯整個資料夾時呼叫)
    writeInit() {
        this.write('// Bootstrap code');
        this.write('@256');
        this.write('D=A');
        this.write('@SP');
        this.write('M=D');
        this.writeCall('Sys.init', 0);
    }

    // 翻譯算術邏輯指令
    writeArithmetic(command) {
        this.write(`// ${command}`);
        switch (command) {
            case 'add':
                this.popTwoToDAndM();
                this.write('M=D+M');
                break;
            case 'sub':
                this.popTwoToDAndM();
                this.write('M=M-D');
                break;
            case 'and':
                this.popTwoToDAndM();
                this.write('M=D&M');
                break;
            case 'or':
                this.popTwoToDAndM();
                this.write('M=D|M');
                break;
            case 'neg':
                this.write('@SP');
                this.write('A=M-1');
                this.write('M=-M');
                break;
            case 'not':
                this.write('@SP');
                this.write('A=M-1');
                this.write('M=!M');
                break;
            case 'eq':
                this.writeComparison('JEQ');
                break;
            case 'gt':
                this.writeComparison('JGT');
                break;
            case 'lt':
                this.writeComparison('JLT');
                break;
        }
    }

    // 翻譯 push 與 pop 指令
    writePushPop(command, segment, index) {
        const segmentMap = {
            local: 'LCL',
            argument: 'ARG',
            this: 'THIS',
            that: 'THAT'
        };

        if (command === CommandType.C_PUSH) {
            this.write(`// push ${segment} ${index}`);
            if (segment === 'constant') {
                this.write(`@${index}`);
                this.write('D=A');
                this.pushDToStack();
            } else if (segmentMap[segment]) {
                this.write(`@${segmentMap[segment]}`);
                this.write('D=M');
                this.write(`@${index}`);
                this.write('A=D+A');
                this.write('D=M');
                this.pushDToStack();
            } else if (segment === 'temp') {
                this.write(`@${5 + index}`);
                this.write('D=M');
                this.pushDToStack();
            } else if (segment === 'pointer') {
                const target = index === 0 ? 'THIS' : 'THAT';
                this.write(`@${target}`);
                this.write('D=M');
                this.pushDToStack();
            } else if (segment === 'static') {
                this.write(`@${this.fileName}.${index}`);
                this.write('D=M');
                this.pushDToStack();
            }
        } else if (command === CommandType.C_POP) {
            this.write(`// pop ${segment} ${index}`);
            if (segmentMap[segment]) {
                this.write(`@${segmentMap[segment]}`);
                this.write('D=M');
                this.write(`@${index}`);
                this.write('D=D+A');
                this.write('@R13');
                this.write('M=D');
                this.popStackToD();
                this.write('@R13');
                this.write('A=M');
                this.write('M=D');
            } else if (segment === 'temp') {
                this.popStackToD();
                this.write(`@${5 + index}`);
                this.write('M=D');
            } else if (segment === 'pointer') {
                const target = index === 0 ? 'THIS' : 'THAT';
                this.popStackToD();
                this.write(`@${target}`);
                this.write('M=D');
            } else if (segment === 'static') {
                this.popStackToD();
                this.write(`@${this.fileName}.${index}`);
                this.write('M=D');
            }
        }
    }

    // 格式化標籤名稱（若在函式內，格式為 FunctionName$label）
    formatLabel(label) {
        return this.currentFunction ? `${this.currentFunction}$${label}` : label;
    }

    // 翻譯 label 指令
    writeLabel(label) {
        this.write(`// label ${label}`);
        this.write(`(${this.formatLabel(label)})`);
    }

    // 翻譯 goto 指令
    writeGoto(label) {
        this.write(`// goto ${label}`);
        this.write(`@${this.formatLabel(label)}`);
        this.write('0;JMP');
    }

    // 翻譯 if-goto 指令
    writeIf(label) {
        this.write(`// if-goto ${label}`);
        this.popStackToD();
        this.write(`@${this.formatLabel(label)}`);
        this.write('D;JNE');
    }

    // 翻譯 function 指令
    writeFunction(functionName, numVars) {
        this.write(`// function ${functionName} ${numVars}`);
        this.currentFunction = functionName;
        this.write(`(${functionName})`);
        for (let i = 0; i < numVars; i++) {
            this.write('@0');
            this.write('D=A');
            this.pushDToStack();
        }
    }

    // 翻譯 call 指令
    writeCall(functionName, numArgs) {
        this.write(`// call ${functionName} ${numArgs}`);
        const returnLabel = `${functionName}$ret.${this.callCounter++}`;

        // 1. push returnAddress
        this.write(`@${returnLabel}`);
        this.write('D=A');
        this.pushDToStack();

        // 2. push LCL, ARG, THIS, THAT
        for (const seg of ['LCL', 'ARG', 'THIS', 'THAT']) {
            this.write(`@${seg}`);
            this.write('D=M');
            this.pushDToStack();
        }

        // 3. ARG = SP - 5 - numArgs
        this.write('@SP');
        this.write('D=M');
        this.write(`@${5 + numArgs}`);
        this.write('D=D-A');
        this.write('@ARG');
        this.write('M=D');

        // 4. LCL = SP
        this.write('@SP');
        this.write('D=M');
        this.write('@LCL');
        this.write('M=D');

        // 5. goto functionName
        this.write(`@${functionName}`);
        this.write('0;JMP');

        // 6. (returnAddress)
        this.write(`(${returnLabel})`);
    }

    // 翻譯 return 指令
    writeReturn() {
        this.write('// return');
        // frame = LCL (暫存於 R13)
        this.write('@LCL');
        this.write('D=M');
        this.write('@R13');
        this.write('M=D');

        // retAddr = *(frame - 5) (暫存於 R14)
        this.write('@5');
        this.write('A=D-A');
        this.write('D=M');
        this.write('@R14');
        this.write('M=D');

        // *ARG = pop() (將回傳值放到呼叫端的 ARG[0])
        this.popStackToD();
        this.write('@ARG');
        this.write('A=M');
        this.write('M=D');

        // SP = ARG + 1
        this.write('@ARG');
        this.write('D=M+1');
        this.write('@SP');
        this.write('M=D');

        // 還原 THAT, THIS, ARG, LCL
        const offsets = [
            { seg: 'THAT', offset: 1 },
            { seg: 'THIS', offset: 2 },
            { seg: 'ARG', offset: 3 },
            { seg: 'LCL', offset: 4 }
        ];
        for (const { seg, offset } of offsets) {
            this.write('@R13');
            this.write('D=M');
            this.write(`@${offset}`);
            this.write('A=D-A');
            this.write('D=M');
            this.write(`@${seg}`);
            this.write('M=D');
        }

        // goto retAddr
        this.write('@R14');
        this.write('A=M');
        this.write('0;JMP');
    }

    popTwoToDAndM() {
        this.write('@SP');
        this.write('AM=M-1');
        this.write('D=M');
        this.write('A=A-1');
    }

    writeComparison(jumpType) {
        const trueLabel = `TRUE_${this.labelCounter}`;
        const endLabel = `END_${this.labelCounter}`;
        this.labelCounter++;

        this.popTwoToDAndM();
        this.write('D=M-D');
        this.write(`@${trueLabel}`);
        this.write(`D;${jumpType}`);

        this.write('@SP');
        this.write('A=M-1');
        this.write('M=0');
        this.write(`@${endLabel}`);
        this.write('0;JMP');

        this.write(`(${trueLabel})`);
        this.write('@SP');
        this.write('A=M-1');
        this.write('M=-1');

        this.write(`(${endLabel})`);
    }

    pushDToStack() {
        this.write('@SP');
        this.write('A=M');
        this.write('M=D');
        this.write('@SP');
        this.write('M=M+1');
    }

    popStackToD() {
        this.write('@SP');
        this.write('AM=M-1');
        this.write('D=M');
    }

    write(line) {
        this.outputLines.push(line);
    }

    close() {
        fs.writeFileSync(this.outputFilePath, this.outputLines.join('\n') + '\n', 'utf-8');
    }
}

module.exports = CodeWriter;