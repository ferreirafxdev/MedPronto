import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogOut, User, Activity, ShieldCheck, Home, Heart } from 'lucide-react';

const Header = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="header">
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, var(--accent), var(--mint))',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
          }}>
            <Heart size={18} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="logo">
            <span style={{ color: 'var(--accent)' }}>Med</span>
            <span style={{ color: 'var(--text-heading)' }}>Pronto</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <NavLink to="/" active={location.pathname === '/'} icon={<Home size={15} />} label="Início" />

          {!user && (
            <>
              <NavLink to="/patient/login" active={isActive('/patient')} icon={<User size={15} />} label="Pacientes" />
              <NavLink to="/doctor/login" active={isActive('/doctor')} icon={<Activity size={15} />} label="Médicos" />
              <NavLink to="/admin/login" active={isActive('/admin')} icon={<ShieldCheck size={15} />} label="Admin" />
            </>
          )}

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginLeft: '0.5rem', paddingLeft: '0.85rem', borderLeft: '1px solid var(--border)' }}>
              {user.role === 'patient' && (
                <NavLink to="/patient/profile" active={isActive('/patient/profile')} icon={<User size={15} />} label="Meu Perfil" />
              )}
              {user.role === 'doctor' && (
                <NavLink to="/doctor/dashboard" active={isActive('/doctor/dashboard')} icon={<Activity size={15} />} label="Minha Fila" />
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-heading)' }}>{user.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--coral)', borderColor: 'var(--coral-light)', gap: '0.3rem' }}
              >
                <LogOut size={13} /> Sair
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

const NavLink = ({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) => (
  <Link
    to={to}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.42rem 0.75rem',
      borderRadius: 'var(--radius-sm)',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      fontWeight: active ? 700 : 500,
      fontSize: '0.84rem',
      background: active ? 'var(--accent-ultra-light)' : 'transparent',
      transition: 'all 0.2s var(--ease)',
      textDecoration: 'none',
    }}
  >
    {icon} {label}
  </Link>
);

export default Header;
