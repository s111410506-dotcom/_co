const fs = require('fs');
const path = require('path');
const JackTokenizer = require('./JackTokenizer');
const CompilationEngine = require('./CompilationEngine');

function processFile(jackFilePath, outputDir) {
    const baseName = path.basename(jackFilePath, '.jack');

    // 1. 產生 XxxT.xml (Tokenizer 測試輸出)
    const tTokenizer = new JackTokenizer(jackFilePath);
    const tLines = ['<tokens>'];
    while (tTokenizer.hasMoreTokens()) {
        tTokenizer.advance();
        const type = tTokenizer.tokenType();
        const val = JackTokenizer.escapeXml(tTokenizer.currentToken.value);
        tLines.push(`<${type}> ${val} </${type}>`);
    }
    tLines.push('</tokens>');
    fs.writeFileSync(path.join(outputDir, `${baseName}T.xml`), tLines.join('\n') + '\n', 'utf8');

    // 2. 產生 Xxx.xml (完整語法分析樹輸出)
    const pTokenizer = new JackTokenizer(jackFilePath);
    const xmlOutputPath = path.join(outputDir, `${baseName}.xml`);
    const engine = new CompilationEngine(pTokenizer, xmlOutputPath);
    engine.compileClass();
    console.log(`Compiled: ${baseName}.jack -> ${baseName}T.xml & ${baseName}.xml`);
}

function main() {
    const target = process.argv[2] || '.';
    const resolvedTarget = path.resolve(target);

    if (!fs.existsSync(resolvedTarget)) {
        console.error(`Error: Path not found -> ${resolvedTarget}`);
        process.exit(1);
    }

    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
        const files = fs.readdirSync(resolvedTarget).filter(f => f.endsWith('.jack'));
        // 建立 out 子資料夾存放輸出，避免覆蓋官方原本的比對用 .xml 檔
        const outDir = path.join(resolvedTarget, 'out');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

        for (const file of files) {
            processFile(path.join(resolvedTarget, file), outDir);
        }
    } else if (resolvedTarget.endsWith('.jack')) {
        const parentDir = path.dirname(resolvedTarget);
        const outDir = path.join(parentDir, 'out');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
        processFile(resolvedTarget, outDir);
    } else {
        console.error('Error: Input must be a .jack file or a directory.');
        process.exit(1);
    }
}

main();