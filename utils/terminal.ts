import { Terminal } from 'xterm';

export async function openTerminal(): Promise<Terminal> {
    const terminal = new Terminal({ cols: 90, rows: 40, theme: { background: "#1a202c" }});
    terminal.open(document.getElementById('terminal')!);
    return terminal;
}