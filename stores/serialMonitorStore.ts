import { defineStore } from 'pinia'

export const useSerialMonitorStore = defineStore('serialMonitor', {
  state: () => {
    return {
      baudRate: 115200,
      isOpen: false,
      terminalBuffer: new Array<string>(),
      isConnected: false,
      isReaderLocked: false,
      port: <SerialPort | undefined>{},
    }
  },
  actions: {
    disconnect() {
      this.isReaderLocked = false
    },
    async unlockPort(port: SerialPort, reader: ReadableStreamDefaultReader<string>) {
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
      const decoderStream = new TextDecoderStream()
      port.readable!.pipeTo(decoderStream.writable)
      const inputStream = decoderStream.readable
      const reader = inputStream.getReader()
      this.isReaderLocked = true

      while (true) {
        if (!this.isReaderLocked) {
          await this.unlockPort(port, reader)
          return
        }
        let { value } = await reader.read()
        if (value) {
          value = value?.replace(/\r/g, '')
          if (value.includes('\n')) {
            value.split('\n').forEach((line, index) => {
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
            const newLine = lastLine + value
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
