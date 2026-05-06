import { useState } from 'react';
import './App.css';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import {
    ArrowRight,
    Clipboard,
    ClipboardCheck,
    FileText,
    GitBranch,
    Network
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Navbar } from './Navbar';
import { InteractiveDemo } from './InteractiveDemo';
import { DocsPage } from './DocsPage';
import { FeedbackPage } from './FeedbackPage';
import NotFoundPage from './NotFoundPage';
import { SEO } from './SEO';

const workflow = [
    {
        step: '01',
        label: 'Hydrate',
        command: 'aigit hydrate',
        detail: 'The agent starts with branch-aware memory instead of an empty chat.'
    },
    {
        step: '02',
        label: 'Commit memory',
        command: 'aigit commit memory "Auth uses signed cookies because API sessions must survive deploys."',
        detail: 'The reason becomes a durable ledger record while it is still fresh.'
    },
    {
        step: '03',
        label: 'Query later',
        command: 'aigit query "Why signed cookies?"',
        detail: 'The next agent retrieves the decision before changing the code.'
    }
];

const capabilities = [
    {
        icon: FileText,
        title: 'Reasoning survives the chat',
        text: 'Aigit records why the code is shaped this way, not just which files changed.'
    },
    {
        icon: GitBranch,
        title: 'Branch memory stays reviewable',
        text: '.aigit/ledger.json travels with Git, so durable context has a visible diff.'
    },
    {
        icon: Network,
        title: 'Agents can use it directly',
        text: 'The core MCP profile exposes hydrate, query, task, and memory tools.'
    }
];

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button className="copy-command" onClick={handleCopy} type="button">
            <code>{command}</code>
            {copied ? <ClipboardCheck size={18} /> : <Clipboard size={18} />}
            <span className="sr-only" aria-live="polite">{copied ? 'Copied install command' : 'Copy install command'}</span>
        </button>
    );
}

function LedgerSpineScene() {
    return (
        <div className="ledger-spine-scene" aria-hidden="true">
            <div className="recorder-halo" />
            <div className="recorder-shell">
                <div className="recorder-topbar">
                    <span>AIGIT FLIGHT RECORDER</span>
                    <code>.aigit/ledger.json</code>
                </div>
                <div className="recorder-screen">
                    <div className="recorder-scanline" />
                    <div className="recorder-track">
                        <span className="track-node active" />
                        <span className="track-node" />
                        <span className="track-node" />
                    </div>
                    <div className="recorder-row incoming">
                        <span>agent asks</span>
                        <strong>Why is auth built this way?</strong>
                        <p>The question usually dies with the chat window.</p>
                    </div>
                    <div className="recorder-row memory">
                        <span>memory locked</span>
                        <strong>Signed cookies survive deploys.</strong>
                        <p>Saved as branch context in Git.</p>
                    </div>
                    <div className="recorder-row query">
                        <span>$ aigit query "why auth?"</span>
                        <strong>1 memory found</strong>
                    </div>
                </div>
                <div className="recorder-footer">
                    <span>branch: feature/auth-refresh</span>
                    <span>status: durable</span>
                </div>
            </div>
        </div>
    );
}

function LandingPage() {
    return (
        <main>
            <SEO
                title="Home"
                description="Aigit stores project reasoning in a Git-tracked memory ledger so AI coding agents can pick up the thread."
            />

            <section className="hero-section">
                <div className="hero-content">
                    <p className="eyebrow">Git-native memory for AI coding agents</p>
                    <h1>aigit</h1>
                    <p className="hero-pain">Your AI agent forgets why the code works.</p>
                    <p className="hero-subtitle">
                        Aigit stores the reason in Git so the next agent can pick up the thread.
                    </p>
                    <div className="hero-actions">
                        <CopyableCommand command="npm install -g aigit-core" />
                        <a href="#workflow" className="secondary-link">
                            See the workflow
                            <ArrowRight size={18} />
                        </a>
                    </div>
                </div>
                <LedgerSpineScene />
            </section>

            <section className="workflow-section" id="workflow" aria-labelledby="workflow-heading">
                <div className="section-heading-row">
                    <div>
                        <p className="section-kicker">Three-command loop</p>
                        <h2 id="workflow-heading">Hydrate. Remember. Query.</h2>
                    </div>
                    <p>
                        Aigit is deliberately narrow: one small loop that keeps durable
                        reasoning inside the repo.
                    </p>
                </div>
                <div className="workflow-rail">
                    {workflow.map((item) => (
                        <article className="workflow-item" key={item.step}>
                            <span>{item.step}</span>
                            <div>
                                <h3>{item.label}</h3>
                                <code>{item.command}</code>
                                <p>{item.detail}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <InteractiveDemo />

            <section className="features-section" aria-labelledby="features-heading">
                <div className="section-heading-row">
                    <div>
                        <p className="section-kicker">Proof points</p>
                        <h2 id="features-heading">A small memory layer with hard edges.</h2>
                    </div>
                    <p>
                        Aigit keeps durable reasoning in files your repo can review,
                        branch, and hand to MCP-connected agents.
                    </p>
                </div>
                <div className="proof-strips">
                    {capabilities.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article className="proof-strip" key={item.title}>
                                <Icon size={22} />
                                <h3>{item.title}</h3>
                                <p>{item.text}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="final-cta" aria-labelledby="final-cta-heading">
                <p className="section-kicker">Start with one memory</p>
                <h2 id="final-cta-heading">Install it before the next session forgets.</h2>
                <div className="final-cta-actions">
                    <CopyableCommand command="npm install -g aigit-core" />
                    <Link to="/docs" className="secondary-link">
                        Read the field manual
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            <footer className="footer-section">
                <p>aigit - Git-native memory for AI coding agents.</p>
                <Link to="/feedback">Send feedback</Link>
            </footer>
        </main>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/docs" element={<DocsPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <Analytics />
                <SpeedInsights />
            </div>
        </BrowserRouter>
    );
}

export default App;
