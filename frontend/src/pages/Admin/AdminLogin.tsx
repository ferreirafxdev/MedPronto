import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';

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
        const resp = await apiClient.post('/api/admin/auth', { login, password });
        if (resp.data.success) {
            setUser({ ...resp.data.admin, token: resp.data.token });
            navigate('/admin/dashboard');
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Acesso administrativo negado.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', margin: '0 auto 0.85rem auto' }}>
            <ShieldCheck size={26} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '0.3rem' }}>Área do Administrador</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Acesso restrito para gestão da plataforma</p>
        </div>
        <form onSubmit={handleAdminAuth}>
          <div className="form-group">
            <label>E-mail Corporativo</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input type="email" className="form-control" placeholder="admin@medpronto.com" required value={login} onChange={(e) => setLogin(e.target.value)} style={{ paddingLeft: '2.3rem' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Senha Master</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input type="password" className="form-control" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '2.3rem' }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ height: '44px' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
