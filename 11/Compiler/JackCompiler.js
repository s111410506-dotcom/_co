const fs = require('fs');
const path = require('path');
const JackTokenizer = require('./JackTokenizer');
const CompilationEngine = require('./CompilationEngine');

function compileFile(jackFilePath) {
    const dir = path.dirname(jackFilePath);
    const baseName = path.basename(jackFilePath, '.jack');
    const vmOutputPath = path.join(dir, `${baseName}.vm`);

    const tokenizer = new JackTokenizer(jackFilePath);
    const engine = new CompilationEngine(tokenizer, vmOutputPath);
    engine.compileClass();
    console.log(`Compiled: ${baseName}.jack -> ${baseName}.vm`);
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
        for (const file of files) {
            compileFile(path.join(resolvedTarget, file));
        }
    } else if (resolvedTarget.endsWith('.jack')) {
        compileFile(resolvedTarget);
    } else {
        console.error('Error: Input must be a .jack file or a directory.');
        process.exit(1);
    }
}

main();