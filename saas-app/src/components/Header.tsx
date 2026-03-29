import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Stethoscope, LogOut, User, Activity, ShieldCheck, Home } from 'lucide-react';

const Header = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="header" style={{ padding: '0.75rem 2rem', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        
        <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.4rem' }}>
          <div className="icon-wrapper" style={{ width: '40px', height: '40px', background: '#e0f2fe', color: '#0369a1', margin: 0 }}>
            <Stethoscope size={24} />
          </div>
          <span>MedPronto<span style={{ color: 'var(--text-primary)' }}>360</span></span>
        </Link>
        
        <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
             <Home size={18} /> Início
          </Link>

          {!user && (
            <>
              <Link to="/patient/login" className={`nav-item ${isActive('/patient') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <User size={18} /> Pacientes
              </Link>
              <Link to="/doctor/login" className={`nav-item ${isActive('/doctor') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <Activity size={18} /> Médicos
              </Link>
              <Link to="/admin/login" className={`nav-item ${isActive('/admin') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <ShieldCheck size={18} /> Admin
              </Link>
            </>
          )}

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </nav>
      </div>
      
      <style>{`
        .nav-item { transition: all 0.2s; }
        .nav-item:hover { color: var(--primary-color) !important; transform: translateY(-1px); }
        .nav-item.active { color: var(--primary-color) !important; font-weight: 700 !important; }
      `}</style>
    </header>
  );
};

export default Header;
