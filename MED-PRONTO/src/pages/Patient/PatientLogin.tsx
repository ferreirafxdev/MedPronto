import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, HeartPulse } from 'lucide-react';
import axios from 'axios';

const PatientLogin = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [formData, setFormData] = useState({ name: 'João Silva', cpf: '123.456.789-00', age: '30', email: 'joao@email.com', complaint: 'Forte dor de cabeça na região frontal, com náuseas faz 2 dias.' });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData({...formData, [e.target.name]: e.target.value}); };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const loginResp = await axios.post('http://localhost:3001/api/patient/auth', { cpf: formData.cpf });
        if (loginResp.data.success) {
           const pat = loginResp.data.patient;
           const enqueueResp = await axios.post('http://localhost:3001/api/enqueue', { ...pat, complaint: formData.complaint || "Retorno" });
           setUser({ id: enqueueResp.data.patient.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
           navigate('/patient/dashboard');
        }
      } else {
        const regResp = await axios.post('http://localhost:3001/api/patient/register', formData);
        if (regResp.data.success) {
           const pat = regResp.data.patient;
           const enqueueResp = await axios.post('http://localhost:3001/api/enqueue', { ...pat, complaint: formData.complaint });
           setUser({ id: enqueueResp.data.patient.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
           navigate('/patient/dashboard');
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro de conexão. Verifique se o sistema está operante.");
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
            {isLogin ? 'Bem-vindo de volta' : 'Nova Consulta'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {isLogin ? 'Entre com seu CPF para retornar' : 'Preencha para entrar na fila virtual'}
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
                  <label>Idade</label>
                  <input required name="age" type="number" value={formData.age} onChange={handleChange} className="form-control" placeholder="30" />
                </div>
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input required name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Seu melhor e-mail" />
              </div>
              <div className="form-group">
                <label>Queixa principal</label>
                <textarea required name="complaint" value={formData.complaint} onChange={handleChange} className="form-control" placeholder="Descreva o que está sentindo..." rows={3}></textarea>
              </div>
            </>
          )}
          {isLogin && (
            <div className="form-group">
              <label>CPF (Login)</label>
              <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.35rem', height: '44px' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Entrar' : 'Entrar na Fila de Atendimento')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{isLogin ? 'Não tem cadastro?' : 'Já tem histórico?'}</span>
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: '0.4rem', fontWeight: 600, fontSize: '0.83rem', fontFamily: 'inherit' }}>
            {isLogin ? 'Nova consulta' : 'Ver histórico'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
