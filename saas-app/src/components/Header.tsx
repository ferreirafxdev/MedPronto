import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Stethoscope, LogOut } from 'lucide-react';

const Header = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <header className="header">
      <Link to="/" className="logo">
        <Stethoscope size={28} />
        <span>MedPronto<span style={{ color: "var(--text-primary)" }}>Online</span></span>
      </Link>
      
      <div className="nav-links">
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Olá, {user.name}</span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem'}}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/patient/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Paciente</Link>
            <Link to="/doctor/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Médico/Admin</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
