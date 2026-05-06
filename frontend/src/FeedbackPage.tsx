import { useState } from 'react';
import './App.css';
import { SEO } from './SEO';

export function FeedbackPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus('loading');

        const form = event.currentTarget;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <main className="feedback-page">
            <SEO
                title="Feedback"
                description="Send feedback, bug reports, or adoption questions for Aigit."
                canonicalUrl="https://aigit.io/feedback"
            />
            <section className="feedback-container">
                <p className="section-kicker">Feedback</p>
                <h1>Tell us where agent memory still breaks.</h1>
                <p>
                    Share setup issues, missing memory workflows, confusing docs, or
                    places where an agent still had to ask you to repeat project reasoning.
                </p>
                <p className="feedback-note">
                    The most useful feedback is concrete: the command you ran, the repo state,
                    and what the agent still failed to remember.
                </p>

                <form className="feedback-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input type="text" id="name" name="name" required placeholder="Your name" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" required placeholder="you@example.com" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="type">Type</label>
                        <select id="type" name="type" required defaultValue="Suggestion">
                            <option value="Suggestion">Suggestion</option>
                            <option value="Bug">Bug report</option>
                            <option value="Question">Question</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="message">Message</label>
                        <textarea id="message" name="message" required rows={6} placeholder="What should we know?" />
                    </div>

                    <button type="submit" className="submit-btn" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Sending...' : 'Send feedback'}
                    </button>

                    {status === 'success' && (
                        <div className="form-message success">
                            Feedback received. Thank you.
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="form-message error">
                            Feedback could not be sent. Please email info@connexsus.io directly.
                        </div>
                    )}
                </form>
            </section>
        </main>
    );
}
