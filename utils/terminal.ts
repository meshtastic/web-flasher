import { Terminal } from '@xterm/xterm'

export async function openTerminal(): Promise<Terminal> {
  // Remove any previous terminal elements from the DOM
  const element = document.getElementById('terminal')
  while (element?.firstChild) {
    element.removeChild(element.firstChild)
  }
  const terminal = new Terminal({ cols: 90, rows: 10, theme: { background: 'rgba(26, 32, 44, 0.4)' } })
  terminal.open(document.getElementById('terminal')!)
  return terminal
}
