import { useState } from 'react';
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
      const loginStr = String(login || '').trim();

      if (loginStr === 'admin@medpronto.com') {
        const respAdmin = await apiClient.post('/api/admin/auth', { login, password });
        if (respAdmin.data.success) {
          setUser({ id: respAdmin.data.admin.id, name: respAdmin.data.admin.name, role: 'admin', token: respAdmin.data.token });
          navigate('/admin/dashboard');
          return;
        }
      } else {
        const resp = await apiClient.post('/api/doctor/auth', { login, password });
        if (resp.data.success) {
          setUser({ id: resp.data.doctor.id, name: resp.data.doctor.name, role: 'doctor', token: resp.data.token });
          navigate('/doctor/dashboard');
          return;
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Credenciais invalidas ou erro de conexao.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="medical-card p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-success-light)] flex items-center justify-center mx-auto mb-3">
            <Stethoscope size={22} className="text-[var(--color-success)]" />
          </div>
          <h2 className="text-[1.25rem] font-semibold mb-1">Area Medica</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">Acesso restrito para profissionais credenciados</p>
        </div>

        {/* Form */}
        <form onSubmit={handleAction} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              CRM ou E-mail
            </label>
            <div className="relative">
              <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                required
                name="login"
                className="medical-input pl-9"
                placeholder="Insira seu CRM ou e-mail"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                required
                name="password"
                type="password"
                className="medical-input pl-9"
                placeholder="Insira sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-2.5 mt-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Acessar Sistema <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorLogin;
