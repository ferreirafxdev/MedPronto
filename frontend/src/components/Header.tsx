import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogOut, User, Activity, ShieldCheck, Home, Heart, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const Header = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    setUser(null);
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <Link to="/" className="logo-link" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-icon">
            <Heart size={18} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="logo-text">
            <span className="med">Med</span>
            <span className="pronto">Pronto</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="desktop-nav">
          <NavLink to="/" active={location.pathname === '/'} icon={<Home size={15} />} label="Início" />

          {!user && (
            <>
              <NavLink to="/patient/login" active={isActive('/patient')} icon={<User size={15} />} label="Pacientes" />
              <NavLink to="/doctor/login" active={isActive('/doctor')} icon={<Activity size={15} />} label="Médicos" />
              <NavLink to="/admin/login" active={isActive('/admin')} icon={<ShieldCheck size={15} />} label="Admin" />
            </>
          )}

          {user && (
            <div className="user-section">
              {user.role === 'patient' && (
                <NavLink to="/patient/profile" active={isActive('/patient/profile')} icon={<User size={15} />} label="Meu Perfil" />
              )}
              {user.role === 'doctor' && (
                <NavLink to="/doctor/dashboard" active={isActive('/doctor/dashboard')} icon={<Activity size={15} />} label="Minha Fila" />
              )}
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={13} /> Sair
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <NavLink to="/" active={location.pathname === '/'} icon={<Home size={18} />} label="Início" onClick={() => setMobileMenuOpen(false)} />
            {!user && (
              <>
                <NavLink to="/patient/login" active={isActive('/patient')} icon={<User size={18} />} label="Pacientes" onClick={() => setMobileMenuOpen(false)} />
                <NavLink to="/doctor/login" active={isActive('/doctor')} icon={<Activity size={18} />} label="Médicos" onClick={() => setMobileMenuOpen(false)} />
                <NavLink to="/admin/login" active={isActive('/admin')} icon={<ShieldCheck size={18} />} label="Admin" onClick={() => setMobileMenuOpen(false)} />
              </>
            )}
            {user && (
              <>
                {user.role === 'patient' && (
                  <NavLink to="/patient/profile" active={isActive('/patient/profile')} icon={<User size={18} />} label="Meu Perfil" onClick={() => setMobileMenuOpen(false)} />
                )}
                {user.role === 'doctor' && (
                  <NavLink to="/doctor/dashboard" active={isActive('/doctor/dashboard')} icon={<Activity size={18} />} label="Minha Fila" onClick={() => setMobileMenuOpen(false)} />
                )}
                <div className="mobile-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.role}</span>
                </div>
                <button onClick={handleLogout} className="btn btn-danger btn-full" style={{ marginTop: '1rem' }}>
                  <LogOut size={16} /> Sair do Sistema
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

const NavLink = ({ to, active, icon, label, onClick }: { to: string; active: boolean; icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`nav-link ${active ? 'active' : ''}`}
  >
    {icon} <span>{label}</span>
  </Link>
);

export default Header;

export default Header;
