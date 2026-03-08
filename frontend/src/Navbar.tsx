import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navbar() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light') {
            setIsDarkMode(false);
            document.body.classList.add('light-theme');
        } else {
            setIsDarkMode(true);
            document.body.classList.remove('light-theme');
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDarkMode;
        setIsDarkMode(newIsDark);
        if (newIsDark) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo">
                    <span className="logo-text">aigit</span>
                </Link>
                <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>Home</Link>
                    <Link to="/docs" className={`nav-link ${location.pathname.includes('/docs') ? 'active' : ''}`}>Docs</Link>
                    <Link to="/feedback" className={`nav-link ${location.pathname === '/feedback' ? 'active' : ''}`}>Feedback</Link>
                    <button
                        onClick={toggleTheme}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                        aria-label="Toggle theme"
                        className="theme-toggle"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>
        </nav>
    );
}
