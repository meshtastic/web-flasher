import { clearCommand } from './terminalCommands';

export type ICommand = {
    name: string;
    alias: string[];
    description: string;
    f: (terminal: Terminal) => Promise<void>;
}

const commands = [
    clearCommand
];

export { commands };