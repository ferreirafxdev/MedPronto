import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, Activity,
  ClipboardList, FileText, Building2, MessageSquare, DollarSign,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, Bell,
  Heart, Search, User
} from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard', roles: ['doctor', 'admin', 'patient'] },
  { icon: <Users size={18} />, label: 'Pacientes', path: '/admin/patients', roles: ['admin'] },
  { icon: <Stethoscope size={18} />, label: 'Consultas', path: '/doctor/dashboard', roles: ['doctor'] },
  { icon: <Activity size={18} />, label: 'Pronto Atendimento', path: '/patient/dashboard', roles: ['patient'] },
  { icon: <ClipboardList size={18} />, label: 'Prescricoes', path: '/prescriptions', roles: ['doctor', 'admin'] },
  { icon: <FileText size={18} />, label: 'Exames', path: '/exams', roles: ['doctor', 'admin', 'patient'] },
  { icon: <MessageSquare size={18} />, label: 'Mensagens', path: '/messages', roles: ['doctor', 'admin', 'patient'] },
  { icon: <DollarSign size={18} />, label: 'Financeiro', path: '/financial', roles: ['admin'] },
  { icon: <BarChart3 size={18} />, label: 'Relatorios', path: '/reports', roles: ['admin'] },
  { icon: <Settings size={18} />, label: 'Configuracoes', path: '/settings', roles: ['doctor', 'admin'] },
];

const getDashboardPath = (role: string) => {
  switch (role) {
    case 'doctor': return '/doctor/dashboard';
    case 'admin': return '/admin/dashboard';
    case 'patient': return '/patient/dashboard';
    default: return '/';
  }
};

const AppLayout = () => {
  const { user, setUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    navigate('/');
  };

  const filteredNav = NAV_ITEMS.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      const dashPath = getDashboardPath(user?.role || '');
      return location.pathname === dashPath || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const resolvedPath = (item: NavItem) => {
    if (item.path === '/dashboard') return getDashboardPath(user?.role || '');
    return item.path;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col
          bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border)]
          transition-all duration-200 ease-in-out
          ${collapsed ? 'w-[68px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-[56px] px-4 border-b border-[var(--color-border)] ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center flex-shrink-0">
            <Heart size={16} color="white" fill="white" strokeWidth={0} />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              MedPronto
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {filteredNav.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={resolvedPath(item)}
                  title={collapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium
                    transition-colors duration-150
                    ${active
                      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-brand)]'
                      : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-bg-hover)]'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-[var(--color-brand)]' : 'text-[var(--color-sidebar-icon)]'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[var(--color-border)] p-2">
          {!collapsed && user && (
            <div className="px-2.5 py-2 mb-1">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{user.name}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">
                {user.role === 'doctor' ? 'Medico' : user.role === 'admin' ? 'Administrador' : 'Paciente'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sair"
            className={`
              flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium
              text-[var(--color-text-secondary)] hover:bg-[var(--color-error-light)] hover:text-[var(--color-error)]
              transition-colors duration-150
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sair</span>}
          </button>

          {/* Collapse Toggle — Desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-full mt-1 py-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronLeft size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-[56px] flex items-center justify-between px-4 lg:px-6 bg-[var(--color-bg-white)] border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              <Menu size={20} />
            </button>

            {/* Search (Desktop) */}
            <div className="hidden md:flex items-center gap-2 bg-[var(--color-bg-subtle)] rounded-lg px-3 py-1.5 w-[280px]">
              <Search size={15} className="text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Buscar paciente, consulta..."
                className="bg-transparent border-none outline-none text-[13px] w-full text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors">
              <Bell size={18} />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)] ml-1">
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center">
                <User size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">{user?.name}</div>
                <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">
                  {user?.role === 'doctor' ? 'Medico' : user?.role === 'admin' ? 'Admin' : 'Paciente'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
