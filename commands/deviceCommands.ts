const connectCommand = <ICommand> {
    name: 'connect',
    alias: [],
    f: async (terminal) => {
        terminal.prompt();
        terminal.clear();
    },
    description: 'Connect to a meshtastic device via web serial'
};
export { connectCommand };