import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from './SEO';

export default function NotFoundPage() {
    return (
        <main className="not-found-page">
            <SEO
                title="404"
                description="The requested Aigit page could not be found."
                canonicalUrl="https://aigit.io/404"
            />
            <section className="not-found-panel">
                <p className="section-kicker">404</p>
                <h1>Page not found</h1>
                <p>
                    This route is not part of the public Aigit site. Return to the
                    homepage or open the memory workflow docs.
                </p>
                <div className="not-found-actions">
                    <Link to="/" className="secondary-link">
                        <ArrowLeft size={18} />
                        Home
                    </Link>
                    <Link to="/docs" className="secondary-link">Docs</Link>
                </div>
            </section>
        </main>
    );
}
