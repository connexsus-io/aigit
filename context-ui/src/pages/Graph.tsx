import { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { AIGIT_UI_TOKEN, API_BASE_URL } from '../config';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<{ mermaid: string, totalFiles: number, totalLinks: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/graph`, { headers: { 'X-Aigit-Ui-Token': AIGIT_UI_TOKEN } })
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGraph();
  }, []);

  useEffect(() => {
    if (graphData && !loading) {
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark',
        securityLevel: 'strict',
        fontFamily: 'Inter'
      });
      mermaid.contentLoaded();
      setTimeout(async () => {
        const element = document.getElementById('mermaid-chart');
        if (element && graphData.mermaid) {
            element.innerHTML = '';
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - Handle hybrid return types in newer mermaid vs older typings
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result: any = await mermaid.render('mermaid-svg', graphData.mermaid);
                const rawHtml = typeof result === 'string' ? result : result.svg;
                element.innerHTML = DOMPurify.sanitize(rawHtml);
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                const errorHtml = `<div class="text-danger p-4 border border-danger/30 rounded bg-danger/10">Mermaid Render Error: ${errorMessage}</div>`;
                element.innerHTML = DOMPurify.sanitize(errorHtml);
            }
        }
      }, 100);
    }
  }, [graphData, loading]);

  return (
    <div className="animate-fade-in flex flex-col h-full" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="glass-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Architecture Graph</h2>
          <p className="text-muted">Live dependency mapping of your workspace semantic state.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchGraph} disabled={loading} aria-busy={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Scanning...' : 'Refresh Graph'}
        </button>
      </header>

      {loading ? (
        <div className="glass-card flex-1 flex items-center justify-center text-muted mt-6" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="status" aria-live="polite">
          <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem' }} /> Mapping module references...
        </div>
      ) : graphData ? (
        <div className="mt-6 flex-1 flex flex-col" style={{ marginTop: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="flex gap-4 mb-4" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
             <div className="glass-card flex-1 py-4 text-center" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: 'var(--bg-surface)' }}>
                <div className="text-2xl font-bold text-gradient">{graphData.totalFiles}</div>
                <div className="text-sm text-muted">Nodes</div>
             </div>
             <div className="glass-card flex-1 py-4 text-center" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: 'var(--bg-surface)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--brand-secondary)' }}>{graphData.totalLinks}</div>
                <div className="text-sm text-muted">Semantic Edges</div>
             </div>
          </div>
          
          <div className="glass-card flex-1 relative overflow-auto" style={{ flex: 1, overflow: 'auto', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '2rem' }}>
            <div id="mermaid-chart" className="flex justify-center min-w-max" style={{ display: 'flex', justifyContent: 'center', minWidth: 'max-content' }}>
               {/* Mermaid injection target */}
            </div>
          </div>
        </div>
      ) : (
          <div className="glass-card mt-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
            <h3 className="text-lg text-danger">Failed to Load Graph Data</h3>
            <p className="text-muted mt-2 mb-4">We were unable to retrieve the architecture graph data from the server.</p>
            <button
              className="btn btn-primary"
              onClick={fetchGraph}
              disabled={loading}
              aria-busy={loading}
              aria-label="Retry loading architecture graph"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
      )}
    </div>
  );
}
