import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Check, X, Sparkles, Loader2, RefreshCw, AlertCircle, Fingerprint, Cpu, FileCode2 } from 'lucide-react';
import { AIGIT_UI_TOKEN, API_BASE_URL } from '../config';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>("");

  // For synthesis mode
  const [synthesizeTarget, setSynthesizeTarget] = useState<string | null>(null);
  const [synthText, setSynthText] = useState("");
  const [actionErrors, setActionErrors] = useState<{ [id: string]: string }>({});
  const synthButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const fetchConflicts = (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/conflicts`, { headers: { 'X-Aigit-Ui-Token': AIGIT_UI_TOKEN } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load conflicts from server');
        return res.json();
      })
      .then(data => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mems = (data.memories || []).map((m: any) => ({ ...m, _renderType: 'memory' }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decs = (data.decisions || []).map((d: any) => ({ ...d, _renderType: 'decision' }));
        setItems([...mems, ...decs]);
        setLoading(false);
        setIsRefreshing(false);
      })
      .catch(err => {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleAction = async (id: string, itemType: string, action: string, content?: string) => {
    setProcessingId(id);
    setProcessingAction(action);
    setActionErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`${API_BASE_URL}/api/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aigit-Ui-Token': AIGIT_UI_TOKEN
        },
        body: JSON.stringify({ id, type: itemType, action, content })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to resolve: ${res.status} ${errText}`);
      }

      const itemToRemove = items.find(i => i.id === id);

      // Remove from UI without full refetch for snappy experience
      setItems(prev => prev.filter(i => i.id !== id));
      if (synthesizeTarget === id) {
        setSynthesizeTarget(null);
      }

      if (itemToRemove) {
        const actionVerb = action === 'discard' ? 'discarded' : 'assimilated';
        setLiveMessage(`Successfully ${actionVerb} ${(itemToRemove as ConflictItem & { _renderType?: string })._renderType || itemType} from ${itemToRemove.originBranch}`);
        // Clear message after a moment so it can be re-announced later if same text happens
        setTimeout(() => setLiveMessage(""), 5000);
      }
    } catch (err) {
      console.error("Failed to resolve", err);
      setActionErrors(prev => ({
        ...prev,
        [id]: err instanceof Error ? err.message : String(err)
      }));
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </div>
      <header className="glass-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Unassimilated Context Inbox</h2>
          <p className="text-muted">Review logic from merged feature branches before enforcing it into the mainline history.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => fetchConflicts(true)}
          disabled={loading || isRefreshing || processingId !== null}
          aria-busy={loading || isRefreshing}
          title={processingId !== null ? "Please wait for the current action to finish" : undefined}
          aria-label={loading || isRefreshing ? 'Scanning unassimilated context inbox...' : 'Refresh Inbox'}
        >
          <RefreshCw size={16} className={loading || isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> {loading || isRefreshing ? 'Scanning...' : 'Refresh Inbox'}
        </button>
      </header>

      {loading && (
        <div className="glass-card flex items-center justify-center mt-8 text-muted" style={{ padding: '2rem' }} role="status" aria-live="polite">
          <Loader2 className="animate-spin" size={24} aria-hidden="true" style={{ marginRight: '0.5rem' }} /> Scanning semantic intersections...
        </div>
      )}

      {!loading && error && (
        <div className="glass-card mt-8" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(350, 80%, 55%, 0.1)' }}>
            <AlertCircle size={48} color="var(--danger)" aria-hidden="true" />
          </div>
          <h3 className="text-lg">Failed to load conflicts</h3>
          <p className="text-muted mt-2 mb-4">{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => fetchConflicts(true)}
            disabled={loading || isRefreshing}
            aria-busy={loading || isRefreshing}
            aria-label={isRefreshing ? 'Retrying loading conflicts...' : 'Try again to load conflicts'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> {isRefreshing ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="glass-card mt-8" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="p-4 rounded-full mb-4" style={{ background: 'hsla(150, 70%, 45%, 0.1)' }}>
            <GitMerge size={48} color="var(--success)" aria-hidden="true" />
          </div>
          <h3>Ledger is clean</h3>
          <p className="text-muted mt-2 mb-4">All semantic memories and decisions have been assimilated into the current branch.</p>
          <button
            className="btn btn-primary"
            onClick={() => fetchConflicts(true)}
            disabled={loading || isRefreshing}
            aria-busy={loading || isRefreshing}
            aria-label={isRefreshing ? 'Scanning ledger for semantic intersections...' : 'Re-scan ledger for semantic intersections'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> {isRefreshing ? 'Scanning...' : 'Re-scan Ledger'}
          </button>
        </div>
      )}

      <div className="conflict-list mt-8" role="list">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div 
              key={item.id} 
              role="listitem"
              className={`conflict-item ${(item as ConflictItem & { _renderType?: string })._renderType} shadow-md`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center" style={{ color: (item as ConflictItem & { _renderType?: string })._renderType === 'memory' ? 'var(--brand-primary)' : 'var(--brand-secondary)'}}>
                      {(item as ConflictItem & { _renderType?: string })._renderType === 'memory' ? <Fingerprint size={14} className="inline mr-1" aria-hidden="true"/> : <Cpu size={14} className="inline mr-1" aria-hidden="true"/>}
                      {(item as ConflictItem & { _renderType?: string })._renderType}
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
                  
                  {item.filePath && (
                    <div className="text-sm text-muted mb-4 flex items-center gap-2" style={{ opacity: 0.8 }}>
                      <FileCode2 size={14} aria-hidden="true" /> <code>{item.filePath}</code>
                    </div>
                  )}

                  {(item as ConflictItem & { _renderType?: string })._renderType === 'memory' ? (
                    <p className="text-lg mt-2 font-medium" style={{ whiteSpace: 'pre-wrap' }}><span className="sr-only">Memory content: </span>{item.content}</p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-muted mb-2">Context: {item.context}</p>
                      <p className="text-lg font-medium text-gradient mb-2">Decision: {item.chosen}</p>
                      <p className="text-sm text-secondary bg-black/20 p-3 rounded-lg border border-white/5">Reason: {item.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>

              {actionErrors[item.id] && (
                <div className="mt-4 p-3 rounded-lg border border-danger bg-danger/10 text-danger text-sm flex items-center gap-2" role="alert" aria-live="assertive">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{actionErrors[item.id]}</span>
                </div>
              )}

              {synthesizeTarget === item.id ? (
                <div className="mt-6 p-4 rounded-lg border border-brand-primary bg-black/20">
                    <h4 id={`synth-heading-${item.id}`} className="mb-2 text-sm text-brand-primary flex items-center gap-2">
                        <Sparkles size={16} aria-hidden="true"/> Edit & Synthesize Knowledge
                    </h4>
                    <span id={`synth-desc-${item.id}`} className="sr-only">
                        Press Command or Control plus Enter to save and assimilate. Press Escape to cancel.
                    </span>
                    <textarea 
                        aria-labelledby={`synth-heading-${item.id}`}
                        aria-describedby={`synth-desc-${item.id}`}
                        className="w-full bg-transparent border border-white/10 rounded p-3 text-white focus:outline-none focus:border-brand-primary mb-3"
                        rows={4}
                        style={{ width: '100%' }}
                        value={synthText}
                        onChange={(e) => setSynthText(e.target.value)}
                        autoFocus
                        placeholder="Refine this memory before assimilation..."
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setSynthesizeTarget(null);
                                setTimeout(() => synthButtonRefs.current[item.id]?.focus(), 0);
                            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                if (synthText.trim() && processingId !== item.id) {
                                    handleAction(item.id, (item as ConflictItem & { _renderType?: string })._renderType || '', 'synthesize', synthText);
                                }
                            }
                        }}
                    />
                    <div className="flex gap-2">
                         <button
                            className="btn btn-primary"
                            onClick={() => handleAction(item.id, (item as ConflictItem & { _renderType?: string })._renderType || '', 'synthesize', synthText)}
                            disabled={processingId !== null || !synthText.trim()}
                            aria-busy={processingId === item.id && processingAction === 'synthesize'}
                            title={processingId !== null && processingId !== item.id ? "Please wait for the current action to finish" : (!synthText.trim() ? "Please enter text to synthesize" : "Save & Assimilate (Cmd/Ctrl + Enter)")}
                            aria-label={processingId === item.id && processingAction === 'synthesize' ? `Saving and assimilating synthesized ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}...` : `Save and assimilate synthesized ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}`}
                        >
                            {processingId === item.id && processingAction === 'synthesize' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Saving...</> : <><Check size={16} aria-hidden="true" /> Save & Assimilate</>}
                            <kbd aria-hidden="true" className="text-xs" style={{ marginLeft: '0.5rem', fontFamily: 'monospace', opacity: 0.7 }}>Cmd/Ctrl+Enter</kbd>
                        </button>
                        <button
                            className="btn"
                            onClick={() => {
                                setSynthesizeTarget(null);
                                setTimeout(() => synthButtonRefs.current[item.id]?.focus(), 0);
                            }}
                            aria-label={`Cancel synthesis for ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}`}
                        >
                            Cancel
                            <kbd aria-hidden="true" className="text-xs text-muted" style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>Esc</kbd>
                        </button>
                    </div>
                </div>
              ) : (
                <div className="conflict-actions">
                    <button 
                        className="btn btn-primary" 
                        onClick={() => handleAction(item.id, (item as ConflictItem & { _renderType?: string })._renderType || '', 'assimilate')}
                        disabled={processingId !== null}
                        aria-busy={processingId === item.id && processingAction === 'assimilate'}
                        title={processingId !== null && processingId !== item.id ? "Please wait for the current action to finish" : undefined}
                        aria-label={processingId === item.id && processingAction === 'assimilate' ? `Assimilating ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}...` : `Keep and assimilate ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}`}
                    >
                        {processingId === item.id && processingAction === 'assimilate' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Assimilating...</> : <><Check size={16} aria-hidden="true" /> Keep & Assimilate</>}
                    </button>
                    
                    {(item as ConflictItem & { _renderType?: string })._renderType === 'memory' && (
                        <button 
                            ref={(el) => { synthButtonRefs.current[item.id] = el; }}
                            className="btn" 
                            disabled={processingId !== null}
                            title={processingId !== null && processingId !== item.id ? "Please wait for the current action to finish" : undefined}
                            onClick={() => {
                                setSynthesizeTarget(item.id);
                                setSynthText(item.content || "");
                            }}
                            aria-label={`Synthesize ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}`}
                        >
                            <Sparkles size={16} aria-hidden="true" /> Synthesize
                        </button>
                    )}
                    
                    <button 
                        className="btn btn-danger"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to discard this context? This action cannot be undone.")) {
                                handleAction(item.id, (item as ConflictItem & { _renderType?: string })._renderType || '', 'discard');
                            }
                        }}
                        disabled={processingId !== null}
                        aria-busy={processingId === item.id && processingAction === 'discard'}
                        title={processingId !== null && processingId !== item.id ? "Please wait for the current action to finish" : undefined}
                        aria-label={processingId === item.id && processingAction === 'discard' ? `Discarding ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}...` : `Discard ${(item as ConflictItem & { _renderType?: string })._renderType} from ${item.originBranch}`}
                    >
                        {processingId === item.id && processingAction === 'discard' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Discarding...</> : <><X size={16} aria-hidden="true" /> Discard Context</>}
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
