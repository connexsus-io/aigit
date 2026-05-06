import { CircleCheck, CircleX, MessageSquareText, Terminal } from 'lucide-react';
import './InteractiveDemo.css';

const beforeLines = [
    'Why does auth use signed cookies?',
    'I do not have that context in this session.',
    'Can you explain the deployment constraint again?'
];

const terminalLines = [
    { kind: 'input', text: 'aigit hydrate' },
    { kind: 'output', text: 'branch: feature/auth-refresh' },
    { kind: 'success', text: 'memory: signed cookies keep API sessions deploy-safe' },
    { kind: 'input', text: 'aigit commit memory "Logout preserves signed-cookie session semantics."' },
    { kind: 'success', text: 'recorded in .aigit/ledger.json' },
    { kind: 'input', text: 'aigit query "Why signed cookies?"' },
    { kind: 'output', text: 'Because API sessions must survive deploys without cache affinity.' }
];

const afterLines = [
    'I hydrated the branch memory before editing.',
    'The old auth decision is in the ledger.',
    'I will preserve the deployment constraint and save the new logout reasoning.'
];

export function InteractiveDemo() {
    return (
        <section className="interactive-demo-section" aria-labelledby="demo-heading">
            <div className="demo-sticky-copy">
                <p className="section-kicker">Remembered session</p>
                <h2 id="demo-heading">Before Aigit, the agent asks you to repeat yourself.</h2>
                <p>
                    After Aigit, the repo answers first. The chat becomes a working
                    surface, not the only place project reasoning exists.
                </p>
            </div>

            <div className="demo-stage">
                <div className="memory-contrast before">
                    <div className="contrast-header">
                        <CircleX size={18} />
                        <span>Without memory</span>
                    </div>
                    {beforeLines.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>

                <div className="demo-terminal">
                    <div className="pane-header">
                        <Terminal size={18} />
                        <span>Terminal</span>
                    </div>
                    <div className="terminal-lines">
                        {terminalLines.map((line, index) => (
                            <div className={`term-line ${line.kind}`} key={`${line.text}-${index}`}>
                                {line.kind === 'input' ? <span className="term-prompt">$</span> : <CircleCheck size={15} />}
                                <span>{line.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="memory-contrast after">
                    <div className="contrast-header">
                        <MessageSquareText size={18} />
                        <span>With Aigit</span>
                    </div>
                    {afterLines.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
            </div>
        </section>
    );
}
