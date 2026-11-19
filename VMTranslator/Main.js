const fs = require('fs');
const path = require('path');
const { Parser, CommandType } = require('./Parser');
const CodeWriter = require('./CodeWriter');

function translateFile(vmFilePath, codeWriter) {
    const parsedPath = path.parse(vmFilePath);
    codeWriter.setFileName(parsedPath.name); // 切換檔案時更新 static 變數的前綴檔名

    const parser = new Parser(vmFilePath);
    while (parser.hasMoreCommands()) {
        const type = parser.commandType();
        switch (type) {
            case CommandType.C_ARITHMETIC:
                codeWriter.writeArithmetic(parser.arg1());
                break;
            case CommandType.C_PUSH:
            case CommandType.C_POP:
                codeWriter.writePushPop(type, parser.arg1(), parser.arg2());
                break;
            case CommandType.C_LABEL:
                codeWriter.writeLabel(parser.arg1());
                break;
            case CommandType.C_GOTO:
                codeWriter.writeGoto(parser.arg1());
                break;
            case CommandType.C_IF:
                codeWriter.writeIf(parser.arg1());
                break;
            case CommandType.C_FUNCTION:
                codeWriter.writeFunction(parser.arg1(), parser.arg2());
                break;
            case CommandType.C_CALL:
                codeWriter.writeCall(parser.arg1(), parser.arg2());
                break;
            case CommandType.C_RETURN:
                codeWriter.writeReturn();
                break;
        }
    }
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.log('用法: node Main.js <檔案.vm 或 資料夾路徑>');
        return;
    }

    const inputPath = path.resolve(args[0]);
    if (!fs.existsSync(inputPath)) {
        console.log('找不到指定的檔案或資料夾！');
        return;
    }

    const stats = fs.statSync(inputPath);
    let vmFiles = [];
    let outputPath = '';
    let isDirectory = false;

    if (stats.isDirectory()) {
        isDirectory = true;
        const dirName = path.basename(inputPath);
        outputPath = path.join(inputPath, `${dirName}.asm`);
        vmFiles = fs.readdirSync(inputPath)
            .filter(file => file.endsWith('.vm'))
            .map(file => path.join(inputPath, file));

        if (vmFiles.length === 0) {
            console.log('該資料夾內沒有任何 .vm 檔案！');
            return;
        }
    } else if (inputPath.endsWith('.vm')) {
        const parsedPath = path.parse(inputPath);
        outputPath = path.join(parsedPath.dir, `${parsedPath.name}.asm`);
        vmFiles = [inputPath];
    } else {
        console.log('請提供有效的 .vm 檔案或包含 .vm 檔案的資料夾！');
        return;
    }

    const codeWriter = new CodeWriter(outputPath);

    // 規範：只有轉譯資料夾（多檔案模式）時才寫入啟動程式碼 (Bootstrap code)
    if (isDirectory) {
        codeWriter.writeInit();
    }

    for (const vmFile of vmFiles) {
        translateFile(vmFile, codeWriter);
    }

    codeWriter.close();
    console.log(`轉譯完成！已生成: ${outputPath}`);
}

main();