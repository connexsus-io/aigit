import { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, SearchX, Cpu, Fingerprint, FileCode2, Loader2, X, RefreshCw, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIGIT_UI_TOKEN, API_BASE_URL } from '../config';

interface SearchResult {
  id: string;
  type: string;
  text: string;
  date: string;
  filePath: string | null;
  symbolName: string | null;
  score: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'X-Aigit-Ui-Token': AIGIT_UI_TOKEN }
      });
      if (!res.ok) {
        throw new Error('Failed to communicate with semantic search engine');
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="glass-header flex flex-col items-start space-y-4">
        <div>
          <h2>Semantic Context Search</h2>
          <p className="text-muted">Query architectural decisions and code memories using native Vector embeddings.</p>
        </div>
        
        <form aria-label="Semantic Context Search" onSubmit={handleSearch} className="w-full flex gap-3 mt-4" style={{ width: '100%', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div className="relative" style={{ flex: 1, position: 'relative' }}>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              ref={inputRef}
              aria-label="Search query"
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. How does authentication layout work?" 
              className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-12 pr-10 text-white focus:outline-none focus:border-brand-primary"
              style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
            />
            {query.length === 0 ? (
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <kbd aria-hidden="true" style={{ fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.7, border: '1px solid var(--border-dim)', borderRadius: '4px', padding: '0.125rem 0.375rem', backgroundColor: 'var(--bg-surface)' }}>/</kbd>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setError(null);
                  setSearched(false);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white focus-visible:ring-2"
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary px-6"
            disabled={loading || !query.trim()}
            aria-busy={loading}
            title={!query.trim() ? "Please enter a search query" : undefined}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Scanning...</> : 'Search'}
          </button>
        </form>
      </header>

      <div aria-live="polite" className="mt-8" style={{ marginTop: '2rem' }}>
        {loading && (
          <div className="glass-card flex items-center justify-center text-muted" style={{ padding: '2rem' }} role="status" aria-live="polite">
            <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem' }} /> Interrogating hyperspace vector embeddings...
          </div>
        )}

        {!loading && !searched && (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', textAlign: 'center' }}>
            <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(0,0%,100%,0.05)' }}>
              <SearchIcon size={48} color="var(--brand-primary)" />
            </div>
            <h3 className="text-lg">Ready to Search</h3>
            <p className="text-muted mt-2">Enter a query above to search architectural decisions and code memories.</p>
          </div>
        )}

        {!loading && error && (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', textAlign: 'center' }}>
            <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(350, 80%, 55%, 0.1)' }}>
              <SearchX size={48} color="var(--danger)" />
            </div>
            <h3 className="text-lg">Search Failed</h3>
            <p className="text-muted mt-2 mb-4">{error}</p>
            <button
              className="btn btn-primary"
              aria-label="Retry search"
              onClick={() => handleSearch()}
            >
              <RefreshCw size={16} /> Retry Search
            </button>
          </div>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', textAlign: 'center' }}>
            <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(0,0%,100%,0.05)' }}>
              <SearchX size={48} color="var(--text-muted)" />
            </div>
            <h3 className="text-lg">No semantic matches found</h3>
            <p className="text-muted mt-2 mb-4">Try rephrasing your search query to capture different architectural intent.</p>
            <button
              className="btn"
              title="Clear search"
              onClick={() => {
                setQuery('');
                setResults([]);
                setError(null);
                setSearched(false);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              <X size={16} /> Clear Search
            </button>
          </div>
        )}

        <div className="conflict-list">
          <AnimatePresence>
            {results.map((item, i) => (
              <motion.div 
                key={item.id} 
                className={`conflict-item shadow-md`}
                style={{ borderLeft: item.type === 'memory' ? '4px solid var(--brand-primary)' : '4px solid var(--brand-secondary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-3 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                       <span className="text-xs font-bold uppercase tracking-wider" style={{ color: item.type === 'memory' ? 'var(--brand-primary)' : 'var(--brand-secondary)'}}>
                        {item.type === 'memory' ? <Fingerprint size={14} className="inline mr-1"/> : <Cpu size={14} className="inline mr-1"/>}
                        {item.type}
                      </span>
                      <span className="text-muted text-sm px-2 py-0.5 rounded-full" style={{ background: 'hsla(0,0%,100%,0.05)', fontSize: '0.8rem', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>
                         Relevance: {Math.round(item.score * 100)}%
                      </span>
                    </div>
                    
                    {item.filePath && (
                      <div className="text-sm text-muted mb-3 flex items-center gap-2" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                        <FileCode2 size={14} /> <code>{item.filePath} {item.symbolName ? `> ${item.symbolName}` : ''}</code>
                      </div>
                    )}

                    <p className="text-base text-primary leading-relaxed" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.text}</p>
                  </div>
                  <button
                    className="btn"
                    onClick={() => handleCopy(item.id, item.text)}
                    aria-label={copiedId === item.id ? "Copied" : "Copy context to clipboard"}
                    title={copiedId === item.id ? "Copied" : "Copy to clipboard"}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '0.5rem',
                      marginLeft: '1rem',
                      color: copiedId === item.id ? 'var(--success)' : 'var(--text-muted)'
                    }}
                  >
                    {copiedId === item.id ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
