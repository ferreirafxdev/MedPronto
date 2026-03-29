import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

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
        
        const resp = await axios.post('http://localhost:3001/api/doctor/auth', { login, password });
        if(resp.data.success) {
            setUser({ id: resp.data.doctor.id, name: resp.data.doctor.name, role: 'doctor' });
            navigate('/doctor/dashboard');
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Erro ao fazer login no servidor Supabase.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={48} color="var(--primary-color)" />
          <h2 style={{ marginTop: '1rem' }}>Área Médica e Admin</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Acesso restrito para colaboradores</p>
        </div>
        
        <form onSubmit={handleAction}>
          <div className="form-group">
            <label>CRM ou E-mail</label>
            <input required name="login" className="form-control" placeholder="CRM ou credencial Admin" />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input required name="password" type="password" className="form-control" placeholder="********" />
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem', height: '50px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorLogin;
