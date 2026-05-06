import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Github, Menu, Moon, Sun, X } from 'lucide-react';

export function Navbar() {
    const location = useLocation();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        const nextDarkMode = !isDarkMode;
        setIsDarkMode(nextDarkMode);
        if (nextDarkMode) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="navbar" aria-label="Primary navigation">
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
                    aigit
                </Link>

                <div className="navbar-links desktop-links">
                    <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
                    <Link to="/docs" className={isActive('/docs') ? 'active' : ''}>Docs</Link>
                    <Link to="/feedback" className={isActive('/feedback') ? 'active' : ''}>Feedback</Link>
                    <a
                        href="https://github.com/connexsus-io/aigit"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Aigit GitHub repository"
                    >
                        <Github size={20} />
                    </a>
                    <button type="button" onClick={toggleTheme} aria-label="Toggle color theme">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <button
                    type="button"
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen((open) => !open)}
                    aria-label="Toggle mobile menu"
                    aria-expanded={isMobileMenuOpen}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="mobile-menu">
                    <Link to="/" className={isActive('/') ? 'active' : ''} onClick={closeMobileMenu}>Home</Link>
                    <Link to="/docs" className={isActive('/docs') ? 'active' : ''} onClick={closeMobileMenu}>Docs</Link>
                    <Link to="/feedback" className={isActive('/feedback') ? 'active' : ''} onClick={closeMobileMenu}>Feedback</Link>
                    <a
                        href="https://github.com/connexsus-io/aigit"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobileMenu}
                    >
                        GitHub
                    </a>
                    <button type="button" onClick={toggleTheme}>
                        {isDarkMode ? 'Light theme' : 'Dark theme'}
                    </button>
                </div>
            )}
        </nav>
    );
}
