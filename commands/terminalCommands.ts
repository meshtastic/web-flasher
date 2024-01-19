const clearCommand = <ICommand> {
    name: 'clear',
    alias: ['cls'],
    f: async (terminal) => {
        terminal.prompt();
        terminal.clear();
    },
    description: 'Clears the terminal screen'
};
export { clearCommand };