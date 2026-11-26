const SymbolTable = require('./SymbolTable');
const VMWriter = require('./VMWriter');

const OPS = new Map([
    ['+', 'add'],
    ['-', 'sub'],
    ['&', 'and'],
    ['|', 'or'],
    ['<', 'lt'],
    ['>', 'gt'],
    ['=', 'eq']
]);

const UNARY_OPS = new Map([
    ['-', 'neg'],
    ['~', 'not']
]);

const KEYWORD_CONSTANTS = new Set(['true', 'false', 'null', 'this']);

class CompilationEngine {
    constructor(tokenizer, outputPath) {
        this.tokenizer = tokenizer;
        this.symbolTable = new SymbolTable();
        this.vmWriter = new VMWriter(outputPath);
        this.className = '';
        this.labelCounter = 0;
    }

    nextLabel(prefix) {
        return `${prefix}_${this.labelCounter++}`;
    }

    kindToSegment(kind) {
        if (kind === 'STATIC') return 'static';
        if (kind === 'FIELD') return 'this';
        if (kind === 'ARG') return 'argument';
        if (kind === 'VAR') return 'local';
        return null;
    }

    eat(expectedValue = null) {
        const val = this.tokenizer.currentToken.value;
        if (expectedValue !== null && val !== expectedValue) {
            throw new Error(`Expected '${expectedValue}', got '${val}'`);
        }
        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance();
        }
        return val;
    }

    compileClass() {
        this.tokenizer.advance();
        this.eat('class');
        this.className = this.eat();
        this.eat('{');

        while (this.tokenizer.tokenType() === 'keyword' &&
            (this.tokenizer.keyWord() === 'static' || this.tokenizer.keyWord() === 'field')) {
            this.compileClassVarDec();
        }

        while (this.tokenizer.tokenType() === 'keyword' &&
            ['constructor', 'function', 'method'].includes(this.tokenizer.keyWord())) {
            this.compileSubroutine();
        }

        this.eat('}');
        this.vmWriter.close();
    }

    compileClassVarDec() {
        const kind = this.eat(); // static | field
        const type = this.eat(); // type
        let name = this.eat();   // varName
        this.symbolTable.define(name, type, kind);

        while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
            this.eat(',');
            name = this.eat();
            this.symbolTable.define(name, type, kind);
        }

        this.eat(';');
    }

    compileSubroutine() {
        this.symbolTable.startSubroutine();
        const subroutineType = this.eat(); // constructor | function | method
        this.eat(); // returnType
        const subroutineName = this.eat();

        if (subroutineType === 'method') {
            this.symbolTable.define('this', this.className, 'ARG');
        }

        this.eat('(');
        this.compileParameterList();
        this.eat(')');
        this.compileSubroutineBody(subroutineType, subroutineName);
    }

    compileParameterList() {
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ')')) {
            let type = this.eat();
            let name = this.eat();
            this.symbolTable.define(name, type, 'ARG');

            while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
                this.eat(',');
                type = this.eat();
                name = this.eat();
                this.symbolTable.define(name, type, 'ARG');
            }
        }
    }

    compileSubroutineBody(subroutineType, subroutineName) {
        this.eat('{');

        while (this.tokenizer.tokenType() === 'keyword' && this.tokenizer.keyWord() === 'var') {
            this.compileVarDec();
        }

        const nLocals = this.symbolTable.varCount('VAR');
        this.vmWriter.writeFunction(`${this.className}.${subroutineName}`, nLocals);

        if (subroutineType === 'constructor') {
            const nFields = this.symbolTable.varCount('FIELD');
            this.vmWriter.writePush('constant', nFields);
            this.vmWriter.writeCall('Memory.alloc', 1);
            this.vmWriter.writePop('pointer', 0);
        } else if (subroutineType === 'method') {
            this.vmWriter.writePush('argument', 0);
            this.vmWriter.writePop('pointer', 0);
        }

        this.compileStatements();
        this.eat('}');
    }

    compileVarDec() {
        this.eat('var');
        const type = this.eat();
        let name = this.eat();
        this.symbolTable.define(name, type, 'VAR');

        while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
            this.eat(',');
            name = this.eat();
            this.symbolTable.define(name, type, 'VAR');
        }

        this.eat(';');
    }

    compileStatements() {
        while (this.tokenizer.tokenType() === 'keyword' &&
            ['let', 'if', 'while', 'do', 'return'].includes(this.tokenizer.keyWord())) {
            const kw = this.tokenizer.keyWord();
            if (kw === 'let') this.compileLet();
            else if (kw === 'if') this.compileIf();
            else if (kw === 'while') this.compileWhile();
            else if (kw === 'do') this.compileDo();
            else if (kw === 'return') this.compileReturn();
        }
    }

    compileLet() {
        this.eat('let');
        const varName = this.eat();
        const kind = this.symbolTable.kindOf(varName);
        const segment = this.kindToSegment(kind);
        const index = this.symbolTable.indexOf(varName);

        let isArray = false;
        if (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === '[') {
            isArray = true;
            this.eat('[');
            this.compileExpression();
            this.eat(']');
            this.vmWriter.writePush(segment, index);
            this.vmWriter.writeArithmetic('add');
        }

        this.eat('=');
        this.compileExpression();
        this.eat(';');

        if (isArray) {
            this.vmWriter.writePop('temp', 0);
            this.vmWriter.writePop('pointer', 1);
            this.vmWriter.writePush('temp', 0);
            this.vmWriter.writePop('that', 0);
        } else {
            this.vmWriter.writePop(segment, index);
        }
    }

    compileIf() {
        const elseLabel = this.nextLabel('IF_ELSE');
        const endLabel = this.nextLabel('IF_END');

        this.eat('if');
        this.eat('(');
        this.compileExpression();
        this.eat(')');

        this.vmWriter.writeArithmetic('not');
        this.vmWriter.writeIf(elseLabel);

        this.eat('{');
        this.compileStatements();
        this.eat('}');

        this.vmWriter.writeGoto(endLabel);
        this.vmWriter.writeLabel(elseLabel);

        if (this.tokenizer.tokenType() === 'keyword' && this.tokenizer.keyWord() === 'else') {
            this.eat('else');
            this.eat('{');
            this.compileStatements();
            this.eat('}');
        }

        this.vmWriter.writeLabel(endLabel);
    }

    compileWhile() {
        const expLabel = this.nextLabel('WHILE_EXP');
        const endLabel = this.nextLabel('WHILE_END');

        this.vmWriter.writeLabel(expLabel);
        this.eat('while');
        this.eat('(');
        this.compileExpression();
        this.eat(')');

        this.vmWriter.writeArithmetic('not');
        this.vmWriter.writeIf(endLabel);

        this.eat('{');
        this.compileStatements();
        this.eat('}');

        this.vmWriter.writeGoto(expLabel);
        this.vmWriter.writeLabel(endLabel);
    }

    compileDo() {
        this.eat('do');
        this.compileSubroutineCall();
        this.eat(';');
        this.vmWriter.writePop('temp', 0);
    }

    compileReturn() {
        this.eat('return');
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ';')) {
            this.compileExpression();
        } else {
            this.vmWriter.writePush('constant', 0);
        }
        this.eat(';');
        this.vmWriter.writeReturn();
    }

    compileSubroutineCall() {
        let firstName = this.eat();
        let fullName = '';
        let nArgs = 0;

        if (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === '.') {
            this.eat('.');
            const subName = this.eat();
            const kind = this.symbolTable.kindOf(firstName);

            if (kind !== 'NONE') {
                // 物件變數呼叫方法：obj.method(...)
                const type = this.symbolTable.typeOf(firstName);
                const segment = this.kindToSegment(kind);
                const index = this.symbolTable.indexOf(firstName);
                this.vmWriter.writePush(segment, index);
                fullName = `${type}.${subName}`;
                nArgs = 1;
            } else {
                // 類別呼叫函式或建構子：Class.function(...)
                fullName = `${firstName}.${subName}`;
            }
        } else {
            // 同類別內直接呼叫方法：method(...)
            this.vmWriter.writePush('pointer', 0);
            fullName = `${this.className}.${firstName}`;
            nArgs = 1;
        }

        this.eat('(');
        nArgs += this.compileExpressionList();
        this.eat(')');
        this.vmWriter.writeCall(fullName, nArgs);
    }

    compileExpression() {
        this.compileTerm();

        while (this.tokenizer.tokenType() === 'symbol' &&
            (OPS.has(this.tokenizer.symbol()) || this.tokenizer.symbol() === '*' || this.tokenizer.symbol() === '/')) {
            const op = this.eat();
            this.compileTerm();

            if (op === '*') {
                this.vmWriter.writeCall('Math.multiply', 2);
            } else if (op === '/') {
                this.vmWriter.writeCall('Math.divide', 2);
            } else {
                this.vmWriter.writeArithmetic(OPS.get(op));
            }
        }
    }

    compileTerm() {
        const type = this.tokenizer.tokenType();

        if (type === 'integerConstant') {
            const val = this.eat();
            this.vmWriter.writePush('constant', val);
        } else if (type === 'stringConstant') {
            const str = this.eat();
            this.vmWriter.writePush('constant', str.length);
            this.vmWriter.writeCall('String.new', 1);
            for (let i = 0; i < str.length; i++) {
                this.vmWriter.writePush('constant', str.charCodeAt(i));
                this.vmWriter.writeCall('String.appendChar', 2);
            }
        } else if (type === 'keyword' && KEYWORD_CONSTANTS.has(this.tokenizer.keyWord())) {
            const kw = this.eat();
            if (kw === 'true') {
                this.vmWriter.writePush('constant', 0);
                this.vmWriter.writeArithmetic('not');
            } else if (kw === 'false' || kw === 'null') {
                this.vmWriter.writePush('constant', 0);
            } else if (kw === 'this') {
                this.vmWriter.writePush('pointer', 0);
            }
        } else if (type === 'symbol' && this.tokenizer.symbol() === '(') {
            this.eat('(');
            this.compileExpression();
            this.eat(')');
        } else if (type === 'symbol' && UNARY_OPS.has(this.tokenizer.symbol())) {
            const op = this.eat();
            this.compileTerm();
            this.vmWriter.writeArithmetic(UNARY_OPS.get(op));
        } else if (type === 'identifier') {
            const next = this.tokenizer.peek();
            if (next && next.type === 'symbol' && next.value === '[') {
                const varName = this.eat();
                const kind = this.symbolTable.kindOf(varName);
                const segment = this.kindToSegment(kind);
                const index = this.symbolTable.indexOf(varName);

                this.eat('[');
                this.compileExpression();
                this.eat(']');

                this.vmWriter.writePush(segment, index);
                this.vmWriter.writeArithmetic('add');
                this.vmWriter.writePop('pointer', 1);
                this.vmWriter.writePush('that', 0);
            } else if (next && next.type === 'symbol' && (next.value === '(' || next.value === '.')) {
                this.compileSubroutineCall();
            } else {
                const varName = this.eat();
                const kind = this.symbolTable.kindOf(varName);
                const segment = this.kindToSegment(kind);
                const index = this.symbolTable.indexOf(varName);
                this.vmWriter.writePush(segment, index);
            }
        }
    }

    compileExpressionList() {
        let count = 0;
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ')')) {
            this.compileExpression();
            count++;
            while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
                this.eat(',');
                this.compileExpression();
                count++;
            }
        }
        return count;
    }
}

module.exports = CompilationEngine;