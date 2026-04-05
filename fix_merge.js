const fs = require('fs');
let content = fs.readFileSync('vscode-aigit/src/prefetch.ts', 'utf8');
content = content.replace(/<<<<<<< HEAD\n            let raw: string;\n            try {\n                \/\/ Use execFileSync to prevent command injection from user-controlled relPath\n                raw = execFileSync\(\n                    'node',\n                    \[path.join\(this.workspaceRoot, 'node_modules\/\.bin\/aigit'\), 'hydrate', relPath, '--json'\],\n=======\n\n            let raw = '';\n            try {\n                raw = execFileSync\(\n                    process.execPath,\n                    \[path.join\(this.workspaceRoot, 'node_modules', '\.bin', 'aigit'\), 'hydrate', relPath, '--json'\],\n>>>>>>> origin\/main/g, `            let raw: string;
            try {
                // Use execFileSync to prevent command injection from user-controlled relPath
                raw = execFileSync(
                    'node',
                    [path.join(this.workspaceRoot, 'node_modules/.bin/aigit'), 'hydrate', relPath, '--json'],`);

content = content.replace(/<<<<<<< HEAD\n            } catch \(err\) {\n=======\n            } catch \(err: any\) {\n                \/\/ Ignore error output, simulate `\|\| echo '{"memories":\[\],"decisions":\[\]}'`\n>>>>>>> origin\/main/g, `            } catch (err) {`);

fs.writeFileSync('vscode-aigit/src/prefetch.ts', content);
