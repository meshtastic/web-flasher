import { defineStore } from 'pinia';

export const useSerialMonitorStore = defineStore("serialMonitor", {
  state: () => {
    return {
      baudRate: 115200,
      isOpen: false,
      terminalBuffer: new Array<string>(),
      isConnected: false,
    };
  },
  actions: {
    async readSerialMonitor(port: SerialPort): Promise<void> {
      this.terminalBuffer = [];
      const decoder = new TextDecoderStream();
      port.readable!.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      while (true) {
        let { value } = await reader.read();
        if (value) {
          value = value?.replace(/\r/g, "");
          if (value.includes("\n")) {
            value.split("\n").forEach((line, index) => {
              if (index === 0) {
                const lastLine =
                  this.terminalBuffer[this.terminalBuffer.length - 1] || "";
                const newLine = lastLine + line;
                this.terminalBuffer[this.terminalBuffer.length - 1] = newLine;
              } else {
                this.terminalBuffer.push(line);
              }
            });
          } else {
            const lastLine =
              this.terminalBuffer[this.terminalBuffer.length - 1] || "";
            const newLine = lastLine + value;
            this.terminalBuffer[this.terminalBuffer.length - 1] = newLine;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    },
    async monitorSerial() {
      const port = await navigator.serial.requestPort({});
      await port.open({ baudRate: this.baudRate });
      this.isOpen = true;
      this.isConnected = true;
      port.ondisconnect = () => {
        this.isConnected = false;
      };
      await this.readSerialMonitor(port);
    },
  },
});
