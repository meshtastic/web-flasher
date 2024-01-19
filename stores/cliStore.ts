import { defineStore } from 'pinia';

import { commands } from '../commands';

export const useCliStore = defineStore('cli', {
    state: () => {
        return {
            terminal: <Terminal>{},
            command: '',
        }
    },
    getters: {
    },
    actions: {
        prompt() {
            this.command = '';
            this.terminal.write('\r\nmeshtastic$ ');
        },
        async runCommand() {
            const issuedCommand = this.command.trim().split(' ')[0].toLowerCase();
            if (issuedCommand.length > 0) {
                this.terminal.writeln('');
                const foundCommand = commands.find(c => c.name === issuedCommand || c.alias.includes(issuedCommand));
                if (foundCommand) {
                    await foundCommand.f(this.terminal);
                    return;
                }
                this.terminal.writeln(`${issuedCommand}: command not found`);
            }
            this.prompt();
        },
        async loadTerminal() {
            const terminal = await openTerminal();
            terminal.onData(e => {
                switch (e) {
                case '\u0003': // Ctrl+C
                    terminal.write('^C');
                    this.prompt();
                    break;
                case '\r': // Enter
                    this.runCommand();
                    this.command = '';
                    break;
                case '\u007F': // Backspace (DEL)
                    // Do not delete the prompt
                    if (this.terminal._core.buffer.x > 2) {
                        this.terminal.write('\b \b');
                        if (this.command.length > 0) {
                            this.command = this.command.substr(0, this.command.length - 1);
                        }
                    }
                    break;
                default: // Print all other characters for demo
                    if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
                        this.command += e;
                        this.terminal.write(e);
                    }
                }
            });
            terminal.prompt = this.prompt
            this.terminal = terminal;
            this.prompt();
        }
    },
})