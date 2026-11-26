const fs = require('fs');

const KEYWORDS = new Set([
    'class', 'constructor', 'function', 'method', 'field', 'static', 'var',
    'int', 'char', 'boolean', 'void', 'true', 'false', 'null', 'this',
    'let', 'do', 'if', 'else', 'while', 'return'
]);

const SYMBOLS = new Set([
    '{', '}', '(', ')', '[', ']', '.', ',', ';', '+', '-', '*', '/',
    '&', '|', '<', '>', '=', '~'
]);

class JackTokenizer {
    constructor(filePath) {
        const raw = fs.readFileSync(filePath, 'utf8');
        this.tokens = this.tokenize(raw);
        this.index = -1;
        this.currentToken = null;
    }

    tokenize(src) {
        const tokens = [];
        let i = 0;
        const len = src.length;

        while (i < len) {
            const ch = src[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            if (ch === '/' && src[i + 1] === '/') {
                i += 2;
                while (i < len && src[i] !== '\n') i++;
                continue;
            }

            if (ch === '/' && src[i + 1] === '*') {
                i += 2;
                while (i < len && !(src[i] === '*' && src[i + 1] === '/')) i++;
                i += 2;
                continue;
            }

            if (SYMBOLS.has(ch)) {
                tokens.push({ type: 'symbol', value: ch });
                i++;
                continue;
            }

            if (ch === '"') {
                i++;
                let str = '';
                while (i < len && src[i] !== '"') {
                    str += src[i];
                    i++;
                }
                i++;
                tokens.push({ type: 'stringConstant', value: str });
                continue;
            }

            if (/[0-9]/.test(ch)) {
                let num = '';
                while (i < len && /[0-9]/.test(src[i])) {
                    num += src[i];
                    i++;
                }
                tokens.push({ type: 'integerConstant', value: num });
                continue;
            }

            if (/[a-zA-Z_]/.test(ch)) {
                let word = '';
                while (i < len && /[a-zA-Z0-9_]/.test(src[i])) {
                    word += src[i];
                    i++;
                }
                const type = KEYWORDS.has(word) ? 'keyword' : 'identifier';
                tokens.push({ type, value: word });
                continue;
            }

            i++;
        }

        return tokens;
    }

    hasMoreTokens() {
        return this.index + 1 < this.tokens.length;
    }

    advance() {
        if (this.hasMoreTokens()) {
            this.index++;
            this.currentToken = this.tokens[this.index];
        }
    }

    peek() {
        if (this.hasMoreTokens()) {
            return this.tokens[this.index + 1];
        }
        return null;
    }

    tokenType() {
        return this.currentToken.type;
    }

    keyWord() {
        return this.currentToken.value;
    }

    symbol() {
        return this.currentToken.value;
    }

    identifier() {
        return this.currentToken.value;
    }

    intVal() {
        return parseInt(this.currentToken.value, 10);
    }

    stringVal() {
        return this.currentToken.value;
    }

    static escapeXml(val) {
        if (val === '<') return '&lt;';
        if (val === '>') return '&gt;';
        if (val === '"') return '&quot;';
        if (val === '&') return '&amp;';
        return val;
    }
}

module.exports = JackTokenizer;