import { defineStore } from 'pinia'

export const useSerialMonitorStore = defineStore('serialMonitor', {
  state: () => {
    return {
      baudRate: 115200,
      isOpen: false,
      terminalBuffer: new Array<string>(),
      rawBuffer: '', // Raw data for xterm
      isConnected: false,
      isReaderLocked: false,
      port: <SerialPort | undefined>{},
    }
  },
  actions: {
    disconnect() {
      this.isReaderLocked = false
    },
    async unlockPort(port: SerialPort, reader: ReadableStreamDefaultReader<Uint8Array>) {
      try {
        const textEncoder = new TextEncoderStream()
        const writer = textEncoder.writable.getWriter()
        const writableStreamClosed = textEncoder.readable.pipeTo(port.writable!)
        reader.cancel()

        writer.close()
        await writableStreamClosed
        await port.forget()
        this.isConnected = false
      }
      catch (e) {
        console.log(e)
      }
    },
    async readSerialMonitor(port: SerialPort): Promise<void> {
      this.terminalBuffer = []
      this.rawBuffer = ''
      const reader = port.readable!.getReader()
      const decoder = new TextDecoder()
      this.isReaderLocked = true

      while (true) {
        if (!this.isReaderLocked) {
          await this.unlockPort(port, reader)
          return
        }
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          const decoded = decoder.decode(value, { stream: true })
          // Append raw data for xterm
          this.rawBuffer += decoded
          
          // Also process into lines for save/copy
          const normalized = decoded.replace(/\r/g, '')
          if (normalized.includes('\n')) {
            normalized.split('\n').forEach((line, index) => {
              if (index === 0) {
                const lastLine
                  = this.terminalBuffer[this.terminalBuffer.length - 1] || ''
                const newLine = lastLine + line
                this.terminalBuffer[this.terminalBuffer.length - 1] = newLine
              }
              else {
                this.terminalBuffer.push(line)
              }
            })
          }
          else {
            const lastLine
              = this.terminalBuffer[this.terminalBuffer.length - 1] || ''
            const newLine = lastLine + normalized
            this.terminalBuffer[this.terminalBuffer.length - 1] = newLine
          }
        }
        await new Promise(resolve => setTimeout(resolve, 5))
      }
    },
    async monitorSerial() {
      this.port = await navigator.serial.requestPort({})
      await this.port.open({ baudRate: this.baudRate })
      this.isOpen = true
      this.isConnected = true
      this.port.ondisconnect = () => {
        this.isConnected = false
      }
      await this.readSerialMonitor(this.port)
    },
  },
})
