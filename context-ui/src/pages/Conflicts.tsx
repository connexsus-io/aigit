import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface ConflictItem {
  id: string;
  type: string;
  content?: string;
  context?: string;
  chosen?: string;
  reasoning?: string;
  gitBranch: string;
  originBranch: string;
  filePath: string | null;
  agentName: string | null;
}

export default function ConflictsPage() {
  const [items, setItems] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // For synthesis mode
  const [synthesizeTarget, setSynthesizeTarget] = useState<string | null>(null);
  const [synthText, setSynthText] = useState("");

  const fetchConflicts = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/conflicts`)
      .then(res => res.json())
      .then(data => {
        const mems = (data.memories || []).map((m: any) => ({ ...m, _renderType: 'memory' }));
        const decs = (data.decisions || []).map((d: any) => ({ ...d, _renderType: 'decision' }));
        setItems([...mems, ...decs]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleAction = async (id: string, type: string, action: string, content?: string) => {
    setProcessingId(id);
    try {
      await fetch(`${API_BASE_URL}/api/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, action, content })
      });
      // Remove from UI without full refetch for snappy experience
      setItems(prev => prev.filter(i => i.id !== id));
      if (synthesizeTarget === id) setSynthesizeTarget(null);
    } catch (err) {
      console.error("Failed to resolve", err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="glass-header">
        <div>
          <h2>Unassimilated Context Inbox</h2>
          <p className="text-muted">Review logic from merged feature branches before enforcing it into the mainline history.</p>
        </div>
      </header>

      {loading && <div className="text-muted p-4">Scanning semantic intersections...</div>}

      {!loading && items.length === 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(150, 70%, 45%, 0.1)' }}>
            <GitMerge size={48} color="var(--success)" />
          </div>
          <h3>Ledger is clean</h3>
          <p className="text-muted mt-2">All semantic memories and decisions have been assimilated into the current branch.</p>
        </div>
      )}

      <div className="conflict-list mt-8">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div 
              key={item.id} 
              className={`conflict-item ${(item as any)._renderType} shadow-md`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: (item as any)._renderType === 'memory' ? 'var(--brand-primary)' : 'var(--brand-secondary)'}}>
                      {(item as any)._renderType}
                    </span>
                    <span className="text-muted text-sm px-2 py-0.5 rounded-full" style={{ background: 'hsla(0,0%,100%,0.05)' }}>
                       Origin: {item.originBranch}
                    </span>
                    {item.agentName && (
                        <span className="text-primary text-sm px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-primary-glow)', color: 'var(--brand-primary)' }}>
                           @{item.agentName}
                        </span>
                    )}
                  </div>
                  
                  {item.filePath && <code className="text-sm text-muted mb-4 block">File: {item.filePath}</code>}

                  {(item as any)._renderType === 'memory' ? (
                    <p className="text-lg mt-2 font-medium" style={{ whiteSpace: 'pre-wrap' }}>{item.content}</p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-muted mb-2">Context: {item.context}</p>
                      <p className="text-lg font-medium text-gradient mb-2">Decision: {item.chosen}</p>
                      <p className="text-sm text-secondary bg-black/20 p-3 rounded-lg border border-white/5">Reason: {item.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>

              {synthesizeTarget === item.id ? (
                <div className="mt-6 p-4 rounded-lg border border-brand-primary bg-black/20">
                    <h4 id={`synth-heading-${item.id}`} className="mb-2 text-sm text-brand-primary flex items-center gap-2">
                        <Sparkles size={16}/> Edit & Synthesize Knowledge
                    </h4>
                    <textarea 
                        aria-labelledby={`synth-heading-${item.id}`}
                        className="w-full bg-transparent border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-primary mb-3"
                        rows={4}
                        style={{ width: '100%' }}
                        value={synthText}
                        onChange={(e) => setSynthText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setSynthesizeTarget(null);
                            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                if (synthText.trim() && processingId !== item.id) {
                                    handleAction(item.id, (item as any)._renderType, 'synthesize', synthText);
                                }
                            }
                        }}
                    />
                    <div className="flex gap-2">
                         <button
                            className="btn btn-primary"
                            onClick={() => handleAction(item.id, (item as any)._renderType, 'synthesize', synthText)}
                            disabled={processingId === item.id || !synthText.trim()}
                            aria-busy={processingId === item.id}
                            title={!synthText.trim() ? "Please enter text to synthesize" : undefined}
                        >
                            {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save & Assimilate
                            <span className="text-muted text-xs" style={{ marginLeft: '0.5rem', opacity: 0.7 }}>Cmd/Ctrl ↵</span>
                        </button>
                        <button className="btn" onClick={() => setSynthesizeTarget(null)}>
                            Cancel
                            <span className="text-muted text-xs" style={{ marginLeft: '0.5rem', opacity: 0.7 }}>Esc</span>
                        </button>
                    </div>
                </div>
              ) : (
                <div className="conflict-actions">
                    <button 
                        className="btn btn-primary" 
                        onClick={() => handleAction(item.id, (item as any)._renderType, 'assimilate')}
                        disabled={processingId === item.id}
                        aria-busy={processingId === item.id}
                    >
                        {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Keep & Assimilate
                    </button>
                    
                    {(item as any)._renderType === 'memory' && (
                        <button 
                            className="btn" 
                            onClick={() => {
                                setSynthesizeTarget(item.id);
                                setSynthText(item.content || "");
                            }}
                        >
                            <Sparkles size={16} /> Synthesize
                        </button>
                    )}
                    
                    <button 
                        className="btn btn-danger"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to discard this context? This action cannot be undone.")) {
                                handleAction(item.id, (item as any)._renderType, 'discard');
                            }
                        }}
                        disabled={processingId === item.id}
                        aria-busy={processingId === item.id}
                    >
                        {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Discard Context
                    </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
