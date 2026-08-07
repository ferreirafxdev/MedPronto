import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
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
      alert(error.response?.data?.error || 'Acesso administrativo negado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="medical-card p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-light)] flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-[var(--color-brand)]" />
          </div>
          <h2 className="text-[1.25rem] font-semibold mb-1">Painel Administrativo</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Acesso restrito para gestao do sistema
          </p>
        </div>

        <form onSubmit={handleAdminAuth} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="email"
                className="medical-input pl-9"
                placeholder="admin@medpronto.com"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              Senha Master
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="password"
                className="medical-input pl-9"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Acessar Painel Admin <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
