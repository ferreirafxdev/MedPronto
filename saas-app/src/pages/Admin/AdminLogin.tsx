import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const resp = await axios.post('http://localhost:3001/api/admin/auth', { login, password });
        if(resp.data.success) {
            setUser(resp.data.admin);
            navigate('/admin/dashboard');
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Acesso administrativo negado.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="icon-wrapper" style={{ backgroundColor: '#bae6fd', color: '#0369a1', marginBottom: '1rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h1>Área do Administrador</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Acesso restrito para gestão da plataforma</p>
        </div>

        <form onSubmit={handleAdminAuth}>
          <div className="form-group">
            <label>E-mail Corporativo</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="admin@medpronto.com" 
              required 
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Senha Master</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '4px' }}>
            💡 Teste: <strong>admin@medpronto.com</strong> | <strong>admin123</strong>
          </p>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
