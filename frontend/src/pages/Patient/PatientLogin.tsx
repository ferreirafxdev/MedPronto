import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, HeartPulse, User, Mail, Calendar, Hash, ArrowRight, MessageSquare, Fingerprint } from 'lucide-react';
import apiClient from '../../api/client';

const PatientLogin = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register';
  const [isLogin, setIsLogin] = useState(!initialMode);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useStore();

  const [formData, setFormData] = useState({
    name: '', cpf: '', age: '', email: '', birthDate: '', complaint: ''
  });

  useEffect(() => {
    if (!isLogin && !localStorage.getItem('payment_confirmed')) {
      navigate('/patient/payment');
    }
  }, [isLogin, navigate]);

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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) age--;
    return age < 0 ? '0' : age.toString();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData({ ...formData, cpf: formatCPF(value) });
    } else if (name === 'birthDate') {
      setFormData({ ...formData, [name]: value, age: calculateAge(value) });
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
          const { patient: pat, token } = loginResp.data;
          setUser({ id: pat.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email, token });
          navigate('/patient/dashboard');
        }
      } else {
        const regResp = await apiClient.post('/api/patient/register', formData);
        if (regResp.data.success) {
          const { patient: pat, token } = regResp.data;
          setUser({ id: pat.id, name: pat.name, role: 'patient', cpf: pat.cpf, age: pat.age, email: pat.email, token });
          if (formData.complaint) localStorage.setItem('temp_complaint', formData.complaint);
          localStorage.removeItem('payment_confirmed');
          navigate('/patient/dashboard?just_registered=true');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('Este CPF ja possui cadastro. Voce sera redirecionado para o login.');
        setIsLogin(true);
        setFormData(prev => ({ ...prev, name: '', email: '', complaint: '' }));
      } else {
        alert(error.response?.data?.error || 'Credenciais invalidas ou erro de conexao.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px]">
      <div className="medical-card p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${isLogin ? 'bg-[var(--color-brand-light)]' : 'bg-[var(--color-error-light)]'}`}>
            {isLogin ? <Fingerprint size={22} className="text-[var(--color-brand)]" /> : <HeartPulse size={22} className="text-[var(--color-error)]" />}
          </div>
          <h2 className="text-[1.25rem] font-semibold mb-1">
            {isLogin ? 'Acessar Prontuario' : 'Nova Consulta'}
          </h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {isLogin ? 'Identifique-se para acessar seu historico.' : 'Cadastre-se para iniciar o atendimento.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAction} className="space-y-4">
          {!isLogin ? (
            <>
              <FormField label="Nome Completo" icon={<User size={14} />}>
                <input required name="name" value={formData.name} onChange={handleChange} className="medical-input" placeholder="Seu nome completo" />
              </FormField>

              <div className="grid grid-cols-[1.2fr_1fr] gap-3">
                <FormField label="CPF" icon={<Hash size={14} />}>
                  <input required name="cpf" value={formData.cpf} onChange={handleChange} className="medical-input" placeholder="000.000.000-00" />
                </FormField>
                <FormField label="Nascimento" icon={<Calendar size={14} />}>
                  <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="medical-input" />
                </FormField>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-3">
                <FormField label="Idade">
                  <input readOnly name="age" value={formData.age} className="medical-input bg-[var(--color-bg-subtle)] text-center font-medium" placeholder="-" />
                </FormField>
                <FormField label="E-mail" icon={<Mail size={14} />}>
                  <input required name="email" type="email" value={formData.email} onChange={handleChange} className="medical-input" placeholder="seu@email.com" />
                </FormField>
              </div>

              <FormField label="Queixa Principal" icon={<MessageSquare size={14} />}>
                <textarea required name="complaint" value={formData.complaint} onChange={handleChange} className="medical-textarea" placeholder="Descreva brevemente o que voce esta sentindo..." rows={3} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="CPF" icon={<Hash size={14} />}>
                <input required name="cpf" value={formData.cpf} onChange={handleChange} className="medical-input" placeholder="000.000.000-00" />
              </FormField>
              <FormField label="Data de Nascimento" icon={<Calendar size={14} />}>
                <input required name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="medical-input" />
              </FormField>
            </>
          )}

          <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {isLogin ? 'Entrar' : 'Cadastrar e Entrar na Fila'}
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-6 pt-5 border-t border-[var(--color-border)]">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-2">
            {isLogin ? 'Primeira consulta?' : 'Ja possui cadastro?'}
          </p>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ ...formData, cpf: '', birthDate: '', age: '' });
            }}
            className="btn-secondary text-[13px] py-1.5 px-4"
          >
            {isLogin ? 'Cadastrar Nova Consulta' : 'Acessar meu historico'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
      {icon && <span className="text-[var(--color-brand)]">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);

export default PatientLogin;
