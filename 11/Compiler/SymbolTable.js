class SymbolTable {
    constructor() {
        this.classScope = new Map();
        this.subroutineScope = new Map();
        this.indices = {
            STATIC: 0,
            FIELD: 0,
            ARG: 0,
            VAR: 0
        };
    }

    startSubroutine() {
        this.subroutineScope.clear();
        this.indices.ARG = 0;
        this.indices.VAR = 0;
    }

    define(name, type, kind) {
        const k = kind.toUpperCase();
        const index = this.indices[k]++;
        const entry = { type, kind: k, index };

        if (k === 'STATIC' || k === 'FIELD') {
            this.classScope.set(name, entry);
        } else {
            this.subroutineScope.set(name, entry);
        }
    }

    varCount(kind) {
        return this.indices[kind.toUpperCase()];
    }

    kindOf(name) {
        if (this.subroutineScope.has(name)) return this.subroutineScope.get(name).kind;
        if (this.classScope.has(name)) return this.classScope.get(name).kind;
        return 'NONE';
    }

    typeOf(name) {
        if (this.subroutineScope.has(name)) return this.subroutineScope.get(name).type;
        if (this.classScope.has(name)) return this.classScope.get(name).type;
        return null;
    }

    indexOf(name) {
        if (this.subroutineScope.has(name)) return this.subroutineScope.get(name).index;
        if (this.classScope.has(name)) return this.classScope.get(name).index;
        return -1;
    }
}

module.exports = SymbolTable;