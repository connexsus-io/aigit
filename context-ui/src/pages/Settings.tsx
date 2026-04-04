import { useState } from 'react';
import { DatabaseZap, ShieldAlert, Check, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{success: boolean, deleted?: number, message?: string} | null>(null);

  const runGC = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/gc', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
          setResult({ success: true, deleted: data.deleted });
      } else {
          setResult({ success: false, message: data.error });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="glass-header">
        <div>
          <h2>System Settings</h2>
          <p className="text-muted">Manage the Context Engine and Database Lifecycle.</p>
        </div>
      </header>

      <div className="mt-8 space-y-6" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="glass-card" style={{ padding: '2rem' }}>
           <div className="flex items-start justify-between" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
             <div>
                <h3 className="flex items-center gap-2 text-lg mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <DatabaseZap size={20} className="text-brand-secondary" style={{ color: 'var(--brand-secondary)' }}/> 
                  Database Garbage Collection
                </h3>
                <p className="text-muted mb-4 max-w-2xl" style={{ maxWidth: '42rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                   Over time, implicit contextual records and aborted branch memories can pile up. 
                   Garbage collection deletes automated internal context older than 30 days and runs a standard SQL VACUUM compression to free memory constraints. 
                   <strong>Architectural decisions and developer memories are strictly preserved.</strong>
                </p>
                {result && (
                  <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'border-success bg-success/10 text-success' : 'border-danger bg-danger/10 text-danger'}`} style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: result.success ? '1px solid var(--success)' : '1px solid var(--danger)', color: result.success ? '#fff' : '#ff4d4f', background: result.success ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255, 77, 79, 0.1)' }}>
                      {result.success ? (
                         <span className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={18}/> GC Complete. Freed {result.deleted} obsolete context items. Database structurally compacted.</span>
                      ) : (
                         <span className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldAlert size={18}/> Exception: {result.message}</span>
                      )}
                  </div>
                )}
             </div>
             <button 
                className={`btn ${running ? '' : 'btn-danger'}`} 
                onClick={runGC}
                disabled={running}
                aria-busy={running}
                style={{ marginLeft: '2rem', flexShrink: 0 }}
             >
                {running ? <><Loader2 size={16} className="animate-spin" /> Running VACUUM...</> : 'Execute Full GC'}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}
