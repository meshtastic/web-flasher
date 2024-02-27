import { Terminal } from 'xterm';

export async function openTerminal(): Promise<Terminal> {
    const terminal = new Terminal({ cols: 90, rows: 10, theme: { background: "#1a202c" }});
    terminal.open(document.getElementById('terminal')!);
    terminal.clear();
    return terminal;
}