const fs = require('fs');
const JackTokenizer = require('./JackTokenizer');

const OPS = new Set(['+', '-', '*', '/', '&', '|', '<', '>', '=']);
const UNARY_OPS = new Set(['-', '~']);
const KEYWORD_CONSTANTS = new Set(['true', 'false', 'null', 'this']);

class CompilationEngine {
    constructor(tokenizer, outputPath) {
        this.tokenizer = tokenizer;
        this.outputPath = outputPath;
        this.lines = [];
        this.indentLevel = 0;
    }

    indent() {
        return '  '.repeat(this.indentLevel);
    }

    openTag(tag) {
        this.lines.push(`${this.indent()}<${tag}>`);
        this.indentLevel++;
    }

    closeTag(tag) {
        this.indentLevel--;
        this.lines.push(`${this.indent()}</${tag}>`);
    }

    writeCurrentToken() {
        const type = this.tokenizer.tokenType();
        const rawVal = this.tokenizer.currentToken.value;
        const val = JackTokenizer.escapeXml(rawVal);
        this.lines.push(`${this.indent()}<${type}> ${val} </${type}>`);
    }

    eat(expectedValue = null) {
        if (expectedValue !== null && this.tokenizer.currentToken.value !== expectedValue) {
            throw new Error(`Expected '${expectedValue}', got '${this.tokenizer.currentToken.value}'`);
        }
        this.writeCurrentToken();
        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance();
        }
    }

    compileClass() {
        this.tokenizer.advance();
        this.openTag('class');
        this.eat('class');
        this.eat(); // className
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
        this.closeTag('class');
        fs.writeFileSync(this.outputPath, this.lines.join('\n') + '\n', 'utf8');
    }

    compileClassVarDec() {
        this.openTag('classVarDec');
        this.eat(); // static | field
        this.eat(); // type
        this.eat(); // varName

        while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
            this.eat(',');
            this.eat(); // varName
        }

        this.eat(';');
        this.closeTag('classVarDec');
    }

    compileSubroutine() {
        this.openTag('subroutineDec');
        this.eat(); // constructor | function | method
        this.eat(); // void | type
        this.eat(); // subroutineName
        this.eat('(');
        this.compileParameterList();
        this.eat(')');
        this.compileSubroutineBody();
        this.closeTag('subroutineDec');
    }

    compileParameterList() {
        this.openTag('parameterList');
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ')')) {
            this.eat(); // type
            this.eat(); // varName
            while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
                this.eat(',');
                this.eat(); // type
                this.eat(); // varName
            }
        }
        this.closeTag('parameterList');
    }

    compileSubroutineBody() {
        this.openTag('subroutineBody');
        this.eat('{');

        while (this.tokenizer.tokenType() === 'keyword' && this.tokenizer.keyWord() === 'var') {
            this.compileVarDec();
        }

        this.compileStatements();
        this.eat('}');
        this.closeTag('subroutineBody');
    }

    compileVarDec() {
        this.openTag('varDec');
        this.eat('var');
        this.eat(); // type
        this.eat(); // varName

        while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
            this.eat(',');
            this.eat(); // varName
        }

        this.eat(';');
        this.closeTag('varDec');
    }

    compileStatements() {
        this.openTag('statements');
        while (this.tokenizer.tokenType() === 'keyword' &&
            ['let', 'if', 'while', 'do', 'return'].includes(this.tokenizer.keyWord())) {
            const kw = this.tokenizer.keyWord();
            if (kw === 'let') this.compileLet();
            else if (kw === 'if') this.compileIf();
            else if (kw === 'while') this.compileWhile();
            else if (kw === 'do') this.compileDo();
            else if (kw === 'return') this.compileReturn();
        }
        this.closeTag('statements');
    }

    compileLet() {
        this.openTag('letStatement');
        this.eat('let');
        this.eat(); // varName

        if (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === '[') {
            this.eat('[');
            this.compileExpression();
            this.eat(']');
        }

        this.eat('=');
        this.compileExpression();
        this.eat(';');
        this.closeTag('letStatement');
    }

    compileIf() {
        this.openTag('ifStatement');
        this.eat('if');
        this.eat('(');
        this.compileExpression();
        this.eat(')');
        this.eat('{');
        this.compileStatements();
        this.eat('}');

        if (this.tokenizer.tokenType() === 'keyword' && this.tokenizer.keyWord() === 'else') {
            this.eat('else');
            this.eat('{');
            this.compileStatements();
            this.eat('}');
        }

        this.closeTag('ifStatement');
    }

    compileWhile() {
        this.openTag('whileStatement');
        this.eat('while');
        this.eat('(');
        this.compileExpression();
        this.eat(')');
        this.eat('{');
        this.compileStatements();
        this.eat('}');
        this.closeTag('whileStatement');
    }

    compileDo() {
        this.openTag('doStatement');
        this.eat('do');
        this.compileSubroutineCall();
        this.eat(';');
        this.closeTag('doStatement');
    }

    compileReturn() {
        this.openTag('returnStatement');
        this.eat('return');
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ';')) {
            this.compileExpression();
        }
        this.eat(';');
        this.closeTag('returnStatement');
    }

    compileSubroutineCall() {
        this.eat(); // subroutineName | className | varName
        if (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === '.') {
            this.eat('.');
            this.eat(); // subroutineName
        }
        this.eat('(');
        this.compileExpressionList();
        this.eat(')');
    }

    compileExpression() {
        this.openTag('expression');
        this.compileTerm();

        while (this.tokenizer.tokenType() === 'symbol' && OPS.has(this.tokenizer.symbol())) {
            this.eat(); // op
            this.compileTerm();
        }

        this.closeTag('expression');
    }

    compileTerm() {
        this.openTag('term');
        const type = this.tokenizer.tokenType();

        if (type === 'integerConstant' || type === 'stringConstant' ||
            (type === 'keyword' && KEYWORD_CONSTANTS.has(this.tokenizer.keyWord()))) {
            this.eat();
        } else if (type === 'symbol' && this.tokenizer.symbol() === '(') {
            this.eat('(');
            this.compileExpression();
            this.eat(')');
        } else if (type === 'symbol' && UNARY_OPS.has(this.tokenizer.symbol())) {
            this.eat(); // unaryOp
            this.compileTerm();
        } else if (type === 'identifier') {
            const next = this.tokenizer.peek();
            if (next && next.type === 'symbol' && next.value === '[') {
                this.eat(); // varName
                this.eat('[');
                this.compileExpression();
                this.eat(']');
            } else if (next && next.type === 'symbol' && (next.value === '(' || next.value === '.')) {
                this.compileSubroutineCall();
            } else {
                this.eat(); // varName
            }
        }

        this.closeTag('term');
    }

    compileExpressionList() {
        this.openTag('expressionList');
        if (!(this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ')')) {
            this.compileExpression();
            while (this.tokenizer.tokenType() === 'symbol' && this.tokenizer.symbol() === ',') {
                this.eat(',');
                this.compileExpression();
            }
        }
        this.closeTag('expressionList');
    }
}

module.exports = CompilationEngine;