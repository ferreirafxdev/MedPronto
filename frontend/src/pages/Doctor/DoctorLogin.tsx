import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Stethoscope, User as UserIcon, Lock, Loader2, ArrowRight } from 'lucide-react';
import apiClient from '../../api/client';

const DoctorLogin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useStore();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const formData = new FormData(e.target as HTMLFormElement);
        const login = formData.get('login');
        const password = formData.get('password');
        
        // Try Doctor Login
        try {
            const resp = await apiClient.post('/api/doctor/auth', { login, password });
            if (resp.data.success) {
                setUser({ id: resp.data.doctor.id, name: resp.data.doctor.name, role: 'doctor', token: resp.data.token });
                navigate('/doctor/dashboard');
                return;
            }
        } catch (doctorErr) {
            // If doctor login fails, try Admin Login
            const respAdmin = await apiClient.post('/api/admin/auth', { login, password });
            if (respAdmin.data.success) {
                setUser({ id: respAdmin.data.admin.id, name: respAdmin.data.admin.name, role: 'admin', token: respAdmin.data.token });
                navigate('/admin/dashboard');
                return;
            }
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Erro ao fazer login no sistema. Credenciais inválidas.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container" style={{ background: 'var(--bg-base)' }}>
      <div className="premium-card animate-fade-in" style={{ maxWidth: '440px', padding: '3.5rem 2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="icon-wrapper" style={{ background: 'var(--mint-light)', margin: '0 auto 0.85rem auto' }}>
            <Stethoscope size={26} color="var(--mint)" />
          </div>
          <h2 style={{ fontSize: '1.45rem', marginBottom: '0.3rem' }}>Área Médica e Admin</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Acesso restrito para colaboradores</p>
        </div>
        <form onSubmit={handleAction}>
          <div className="form-group">
            <label>CRM ou E-mail</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input required name="login" className="form-control" placeholder="CRM ou credencial Admin" style={{ paddingLeft: '2.3rem' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input required name="password" type="password" className="form-control" placeholder="••••••••" style={{ paddingLeft: '2.3rem' }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.75rem' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                Acessar Sistema <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorLogin;
