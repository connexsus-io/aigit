export interface CoreCommandSpec {
    displayName: string;
    helpArgs: string[];
}

function tokenizeCommand(command: string): string[] {
    return command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
}

function isCommandPathBoundary(token: string): boolean {
    return token.startsWith('-')
        || (token.startsWith('<') && token.endsWith('>'))
        || token.startsWith('"')
        || token.startsWith("'")
        || /^[A-Z][A-Z0-9_-]*$/.test(token);
}

function toCommandPath(documentedCommand: string): string[] {
    const tokens = tokenizeCommand(documentedCommand);
    if (tokens[0] !== 'aigit') {
        throw new Error(`expected an aigit command, received "${documentedCommand}"`);
    }

    const commandPath: string[] = [];
    for (const token of tokens.slice(1)) {
        if (isCommandPathBoundary(token)) break;
        commandPath.push(token);
    }

    if (commandPath.length === 0) {
        throw new Error(`missing command path in "${documentedCommand}"`);
    }

    return commandPath;
}

export function parseCoreCommandSpecs(markdown: string, sourceLabel: string): CoreCommandSpec[] {
    const section = markdown.match(/## Core Commands[\s\S]*?(?=\n## |\n$)/);
    if (!section) throw new Error(`missing Core Commands section in ${sourceLabel}`);

    const commands: CoreCommandSpec[] = [];
    const commandRegex = /\|\s+`(aigit\s+[^`]+)`\s+\|/g;
    for (const match of section[0].matchAll(commandRegex)) {
        const commandPath = toCommandPath(match[1].trim());
        commands.push({
            displayName: commandPath.join(' '),
            helpArgs: [...commandPath, '--help'],
        });
    }

    return commands;
}
