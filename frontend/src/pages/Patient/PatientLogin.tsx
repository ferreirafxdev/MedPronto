import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, HeartPulse, User, Mail, Calendar, Hash, ArrowRight, MessageSquare, Fingerprint, CreditCard, CheckCircle } from 'lucide-react';
import apiClient from '../../api/client';

const PatientLogin = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useStore();
  
  const [formData, setFormData] = useState({ 
    name: '', 
    cpf: '', 
    age: '', 
    email: '', 
    birthDate: '',
    complaint: '' 
  });

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    setLoading(true);
    try {
      const resp = await apiClient.get(`/api/payment/verify-session/${sessionId}`);
      if (resp.data.success) {
        setIsPaid(true);
        setIsLogin(false); // Force registration mode if paid
      }
    } catch (error) {
      console.error("Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    setLoading(true);
    try {
      const resp = await apiClient.post('/api/payment/create-checkout');
      if (resp.data.url) {
        window.location.href = resp.data.url;
      }
    } catch (error) {
      alert("Erro ao iniciar checkout do Stripe.");
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let masked = digits;
    if (digits.length > 3) masked = digits.slice(0, 3) + '.' + digits.slice(3);
    if (digits.length > 6) masked = masked.slice(0, 7) + '.' + digits.slice(6);
    if (digits.length > 9) masked = masked.slice(0, 11) + '-' + digits.slice(9);
    return masked.slice(0, 14);
  };

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
    if (name === 'cpf') {
      setFormData({ ...formData, cpf: formatCPF(value) });
    } else if (name === 'birthDate') {
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
    <div className="auth-container" style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, #ffffff 100%)' }}>
      <div className="glass-card" style={{ maxWidth: '540px', padding: '3rem' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="icon-wrapper" style={{ 
            background: isPaid ? 'var(--mint-light)' : (isLogin ? 'var(--accent-ultra-light)' : 'var(--coral-light)'), 
            margin: '0 auto 1rem auto',
            width: '64px', height: '64px',
            transition: 'all 0.4s var(--ease-spring)'
          }}>
            {isPaid ? <CheckCircle size={32} color="var(--mint)" /> : (isLogin ? <Fingerprint size={32} color="var(--accent)" /> : <HeartPulse size={32} color="var(--coral)" />)}
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
            {isPaid ? 'Pagamento Confirmado!' : (isLogin ? 'Acessar Prontuário' : 'Nova Consulta')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            {isPaid ? 'Agora complete sua triagem para entrar na fila.' : (isLogin ? 'Bem-vindo de volta! Identifique-se para continuar.' : 'Inicie seu atendimento imediato via telemedicina.')}
          </p>
        </div>

        {/* CONTENT */}
        {!isLogin && !isPaid ? (
          <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '1px dashed var(--border)' }}>
              <div style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>R$ 50,00</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor da Consulta Avulsa</div>
            </div>
            <button 
              onClick={handleStartConsultation} 
              disabled={loading}
              className="btn btn-primary btn-full btn-lg"
              style={{ boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.25)' }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>Pagar e Iniciar <CreditCard size={18} /></>
              )}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Você será redirecionado para o pagamento seguro do Stripe.</p>
          </div>
        ) : (
          <form onSubmit={handleAction} style={{ display: 'grid', gap: '1.25rem' }}>
            {!isLogin ? (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={14} /> Nome Completo
                  </label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="form-control" placeholder="Ex: João Silva" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Hash size={14} /> CPF
                    </label>
                    <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} /> Nascimento
                    </label>
                    <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="form-control" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: 'var(--accent)', fontWeight: 700 }}>Idade</label>
                    <input readOnly name="age" value={formData.age} className="form-control" style={{ background: 'var(--bg-subtle)', fontWeight: 700, textAlign: 'center' }} placeholder="—" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={14} /> E-mail
                    </label>
                    <input required name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="seu@email.com" />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageSquare size={14} /> O que você está sentindo?
                  </label>
                  <textarea required name="complaint" value={formData.complaint} onChange={handleChange} className="form-control" placeholder="Descreva brevemente sua queixa atual..." rows={3} />
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gap: '1.25rem', animation: 'fadeIn 0.4s ease' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Hash size={14} /> Seu CPF
                  </label>
                  <input required name="cpf" value={formData.cpf} onChange={handleChange} className="form-control" placeholder="000.000.000-00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> Data de Nascimento
                  </label>
                  <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="form-control" />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.5rem', boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.25)' }} disabled={loading}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {isLogin ? 'Entrar no Painel' : 'Concluir e Entrar na Fila'}
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {isLogin ? (isPaid ? 'Pagamento já realizado.' : 'Ainda não é paciente?') : 'Já possui cadastro?'}
          </p>
          {!isPaid && (
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ ...formData, cpf: '', birthDate: '', age: '' });
              }} 
              className="btn btn-outline"
              style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.5rem', fontSize: '0.82rem' }}
            >
              {isLogin ? 'Nova consulta' : 'Acessar meu histórico'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
atientLogin;
