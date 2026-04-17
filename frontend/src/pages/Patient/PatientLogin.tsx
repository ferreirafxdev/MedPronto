import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, HeartPulse } from 'lucide-react';
import apiClient from '../../api/client';

const PatientLogin = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [formData, setFormData] = useState({ 
    name: 'João Silva', 
    cpf: '123.456.789-00', 
    age: '30', 
    email: 'joao@email.com', 
    birthDate: '1994-05-15',
    complaint: '' 
  });

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age < 0 ? '0' : age.toString();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
    const { name, value } = e.target;
    if (name === 'birthDate') {
      const newAge = calculateAge(value);
      setFormData({ ...formData, [name]: value, age: newAge });
    } else {
      setFormData({ ...formData, [name]: value }); 
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const loginResp = await apiClient.post('/api/patient/auth', { 
          cpf: formData.cpf, 
          birthDate: formData.birthDate 
        });
        if (loginResp.data.success) {
            const pat = loginResp.data.patient;
            setUser({ id: pat.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
            navigate('/patient/dashboard');
        }
      } else {
        const regResp = await apiClient.post('/api/patient/register', formData);
        if (regResp.data.success) {
            const pat = regResp.data.patient;
            setUser({ id: pat.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
            navigate('/patient/dashboard');
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Credenciais inválidas ou erro de conexão.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="icon-wrapper" style={{ background: 'var(--coral-light)', margin: '0 auto 0.85rem auto' }}>
            <HeartPulse size={26} color="var(--coral)" />
          </div>
          <h2 style={{ fontSize: '1.45rem', marginBottom: '0.3rem' }}>
            {isLogin ? 'Acessar Prontuário' : 'Nova Consulta'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {isLogin ? 'Entre com seu CPF e data de nascimento' : 'Preencha para iniciar seu atendimento'}
          </p>
        </div>
        <form onSubmit={handleAction}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Nome Completo</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="form-control" placeholder="Seu nome" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>CPF</label>
                  <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
                </div>
                <div className="form-group">
                  <label>Data de Nascimento</label>
                  <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="form-control" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Idade (Auto)</label>
                  <input readOnly name="age" type="number" value={formData.age} className="form-control" placeholder="30" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input required name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Seu melhor e-mail" />
                </div>
              </div>
            </>
          )}
          {isLogin && (
            <>
              <div className="form-group">
                <label>CPF</label>
                <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="form-control" />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.35rem', height: '44px' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Entrar' : 'Cadastrar e Acessar')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{isLogin ? 'Não tem cadastro?' : 'Já é nosso paciente?'}</span>
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: '0.4rem', fontWeight: 600, fontSize: '0.83rem', fontFamily: 'inherit' }}>
            {isLogin ? 'Nova consulta' : 'Acesse seu perfil'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
