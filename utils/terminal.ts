import { Terminal } from 'xterm';

export async function openTerminal(): Promise<Terminal> {
    // Remove any previous terminal elements from the DOM
    const element = document.getElementById('terminal');
    while (element?.firstChild) {
        element.removeChild(element.firstChild);
    }
    const terminal = new Terminal({ cols: 90, rows: 10, theme: { background: "#1a202c" }});
    terminal.open(document.getElementById('terminal')!);
    return terminal;
}