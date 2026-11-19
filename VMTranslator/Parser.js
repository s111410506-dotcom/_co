const fs = require('fs');

const CommandType = {
    C_ARITHMETIC: 'C_ARITHMETIC',
    C_PUSH: 'C_PUSH',
    C_POP: 'C_POP',
    C_LABEL: 'C_LABEL',
    C_GOTO: 'C_GOTO',
    C_IF: 'C_IF',
    C_FUNCTION: 'C_FUNCTION',
    C_RETURN: 'C_RETURN',
    C_CALL: 'C_CALL'
};

class Parser {
    constructor(inputFilePath) {
        const content = fs.readFileSync(inputFilePath, 'utf-8');
        this.commands = content
            .split(/\r?\n/)
            .map(line => line.split('//')[0].trim())
            .filter(line => line.length > 0);
        this.currentIndex = -1;
        this.currentCommand = '';
    }

    hasMoreCommands() {
        if (this.currentIndex + 1 < this.commands.length) {
            this.currentIndex++;
            this.currentCommand = this.commands[this.currentIndex];
            return true;
        }
        return false;
    }

    commandType() {
        const cmd = this.currentCommand.split(/\s+/)[0];
        switch (cmd) {
            case 'push': return CommandType.C_PUSH;
            case 'pop': return CommandType.C_POP;
            case 'label': return CommandType.C_LABEL;
            case 'goto': return CommandType.C_GOTO;
            case 'if-goto': return CommandType.C_IF;
            case 'function': return CommandType.C_FUNCTION;
            case 'return': return CommandType.C_RETURN;
            case 'call': return CommandType.C_CALL;
            default: return CommandType.C_ARITHMETIC;
        }
    }

    arg1() {
        const parts = this.currentCommand.split(/\s+/);
        if (this.commandType() === CommandType.C_ARITHMETIC) {
            return parts[0];
        }
        return parts[1];
    }

    arg2() {
        const parts = this.currentCommand.split(/\s+/);
        return parseInt(parts[2], 10);
    }
}

module.exports = { Parser, CommandType };