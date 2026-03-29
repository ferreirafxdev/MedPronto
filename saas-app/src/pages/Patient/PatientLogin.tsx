import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

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
    complaint: 'Forte dor de cabeça na região frontal, com náuseas faz 2 dias.'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        // Authenticate existing patient
        const loginResp = await axios.post('http://localhost:3001/api/patient/auth', { cpf: formData.cpf });
        if (loginResp.data.success) {
           const pat = loginResp.data.patient;
           // Enqueue them
           const enqueueResp = await axios.post('http://localhost:3001/api/enqueue', { ...pat, complaint: formData.complaint || "Retorno" });
           setUser({ id: enqueueResp.data.patient.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
           navigate('/patient/dashboard');
        }
      } else {
        // Register new patient
        const regResp = await axios.post('http://localhost:3001/api/patient/register', formData);
        if (regResp.data.success) {
           const pat = regResp.data.patient;
           const enqueueResp = await axios.post('http://localhost:3001/api/enqueue', { ...pat, complaint: formData.complaint });
           setUser({ id: enqueueResp.data.patient.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email });
           navigate('/patient/dashboard');
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro. Verifique se o backend está rodando e se as tabelas existem no Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem' }}>
          {isLogin ? 'Bem-vindo de volta' : 'Nova Consulta (Fila)'}
        </h2>
        
        <form onSubmit={handleAction}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Nome Completo</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="form-control" placeholder="Seu nome" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>CPF</label>
                  <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
                </div>
                <div className="form-group">
                  <label>Idade</label>
                  <input required name="age" type="number" value={formData.age} onChange={handleChange} className="form-control" placeholder="Ex: 30" />
                </div>
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input required name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Seu melhor e-mail" />
              </div>
              <div className="form-group">
                <label>Qual a sua queixa principal?</label>
                <textarea required name="complaint" value={formData.complaint} onChange={handleChange} className="form-control" placeholder="Descreva o que está sentindo..."></textarea>
              </div>
            </>
          )}

          {isLogin && (
            <>
              <div className="form-group">
                <label>CPF (Login)</label>
                <input required className="form-control" placeholder="000.000.000-00" />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem', height: '50px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar' : 'Entrar na Fila de Atendimento')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? 'Não tem cadastro?' : 'Já tem histórico?'}
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 600 }}>
            {isLogin ? 'Nova consulta' : 'Ver histórico'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default PatientLogin;
