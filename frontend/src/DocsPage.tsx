import { SEO } from './SEO';

const taskSections = [
    {
        id: 'install',
        title: 'Install Aigit',
        body: 'Install the CLI, initialize the repo-local memory files, then run doctor to see what is missing.',
        command: `npm install -g aigit-core
aigit init
aigit doctor
aigit doctor --fix`
    },
    {
        id: 'start-session',
        title: 'Start an agent session',
        body: 'Load the Git-tracked ledger into the local memory DB, then hydrate focused context for the current branch.',
        command: `aigit load
aigit hydrate`
    },
    {
        id: 'save-memory',
        title: 'Save a memory',
        body: 'Capture reasoning that another agent or developer should not have to rediscover.',
        command: `aigit commit memory "Auth uses signed cookies because API sessions must survive deploys."
aigit commit decision "Session storage" "Keep signed cookies instead of cache-backed sessions."`
    },
    {
        id: 'track-task',
        title: 'Track complex work',
        body: 'Use tasks when a change needs handoff context or status that should survive one chat session.',
        command: `aigit commit task "Refine auth session behavior"
aigit update task refine-auth-session-behavior IN_PROGRESS`
    },
    {
        id: 'query-later',
        title: 'Query memory later',
        body: 'Ask the repo why a decision exists before changing code that depends on it.',
        command: `aigit query "Why do API sessions use signed cookies?"
aigit hydrate`
    },
    {
        id: 'mcp',
        title: 'Use MCP',
        body: 'Point your coding agent at the core MCP profile so it can hydrate, query, and save memory through tools.',
        command: `{
  "mcpServers": {
    "aigit": {
      "command": "aigit",
      "args": ["mcp", "/absolute/path/to/your/repo"]
    }
  }
}`
    },
    {
        id: 'repair',
        title: 'Repair and check the ledger',
        body: 'Before commit or handoff, run conservative repair and the ledger guard when this repo provides it.',
        command: `aigit repair ledger
npm run check:ledger`
    }
];

const advancedCommands = [
    ['aigit advanced', 'List secondary commands without making them part of the default workflow.'],
    ['aigit hydrate --full-rules', 'Include full detected rule files for setup and debugging.'],
    ['aigit mcp --profile all <repo>', 'Expose every MCP tool when you explicitly need advanced behavior.'],
    ['aigit check-conflicts main', 'Check semantic memory conflicts before a merge.'],
    ['aigit handoff <task-slug>', 'Generate a short handoff block for another agent.']
];

function CodeBlock({ children }: { children: string }) {
    return (
        <pre className="docs-code"><code>{children}</code></pre>
    );
}

export function DocsPage() {
    return (
        <main className="docs-page">
            <SEO
                title="Docs"
                description="Aigit field manual for installing the Git-tracked memory ledger, hydrating agent context, saving reasoning, querying later, and checking ledger health."
                canonicalUrl="https://aigit.io/docs"
            />

            <header className="docs-hero">
                <p className="section-kicker">Field manual</p>
                <h1>Use Aigit when agents need to remember why the code works.</h1>
                <p>
                    Aigit stores durable project reasoning in a Git-tracked ledger. The
                    default flow is intentionally small: initialize, hydrate context,
                    save memory or task state, repair the ledger, and query it later.
                </p>
            </header>

            <div className="docs-layout">
                <aside className="docs-nav" aria-label="Documentation sections">
                    {taskSections.map((section) => (
                        <a href={`#${section.id}`} key={section.id}>{section.title}</a>
                    ))}
                    <a href="#advanced">Advanced reference</a>
                </aside>

                <div className="docs-content">
                    {taskSections.map((section) => (
                        <section id={section.id} className="docs-section" key={section.id}>
                            <h2>{section.title}</h2>
                            <p>{section.body}</p>
                            <CodeBlock>{section.command}</CodeBlock>
                        </section>
                    ))}

                    <section id="advanced" className="docs-section">
                        <h2>Advanced reference</h2>
                        <p>
                            These commands remain available, but they are secondary to the
                            memory loop. Use them when setup, debugging, or merge review
                            calls for more detail.
                        </p>
                        <div className="docs-command-table">
                            {advancedCommands.map(([command, description]) => (
                                <div className="docs-command-row" key={command}>
                                    <code>{command}</code>
                                    <p>{description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
