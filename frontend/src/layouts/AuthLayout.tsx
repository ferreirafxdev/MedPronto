import { Outlet } from 'react-router-dom';
import { Heart } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* Minimal Header */}
      <header className="h-[56px] flex items-center px-6 border-b border-[var(--color-border)] bg-[var(--color-bg-white)]">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
            <Heart size={16} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            MedPronto
          </span>
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[12px] text-[var(--color-text-muted)]">
        MedPronto Telemedicina &mdash; Sistema de Saude Digital
      </footer>
    </div>
  );
};

export default AuthLayout;
