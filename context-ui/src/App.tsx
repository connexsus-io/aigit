
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Activity, GitMerge, Settings, BrainCircuit, Search as SearchIcon, Network } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import ConflictsPage from './pages/Conflicts';
import SearchPage from './pages/Search';
import GraphPage from './pages/Graph';
import SettingsPage from './pages/Settings';

const Sidebar = () => (
  <nav className="sidebar animate-fade-in">
    <div className="brand">
      <BrainCircuit size={28} color="var(--brand-primary)" />
      <span>Aigit Context</span>
    </div>
    
    <div className="nav-links mt-8" style={{ marginTop: '2rem' }}>
      <NavLink to="/stats" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <Activity size={20} />
        Platform Stats
      </NavLink>
      <NavLink to="/search" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <SearchIcon size={20} />
        Semantic Search
      </NavLink>
      <NavLink to="/graph" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <Network size={20} />
        Context Graph
      </NavLink>
      <NavLink to="/conflicts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <GitMerge size={20} />
        Conflict Resolution
      </NavLink>
    </div>
    
    <div style={{ flex: 1 }} />
    
    <div className="nav-links">
      <NavLink to="/settings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        Settings
      </NavLink>
    </div>
  </nav>
);

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/stats" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/conflicts" element={<ConflictsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/stats" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
