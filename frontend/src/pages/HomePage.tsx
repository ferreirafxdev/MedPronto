import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Heart, ArrowRight, Shield, Clock, Video,
  FileText, CheckCircle, Users, Stethoscope, Activity
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  if (user) {
    const dashPath = user.role === 'doctor' ? '/doctor/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard';
    navigate(dashPath, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="h-[56px] flex items-center justify-between px-6 lg:px-12 border-b border-[var(--color-border)] bg-[var(--color-bg-white)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
            <Heart size={16} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            MedPronto
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <button
            onClick={() => navigate('/patient/payment')}
            className="btn-secondary text-[13px] py-2 px-4"
          >
            Paciente
          </button>
          <button
            onClick={() => navigate('/doctor/login')}
            className="btn-primary text-[13px] py-2 px-4"
          >
            Area Medica
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[var(--color-brand-light)] text-[var(--color-brand)] text-[12px] font-medium px-3 py-1 rounded-full mb-5">
              <Activity size={13} />
              Pronto Atendimento Online
            </div>
            <h1 className="text-[2.25rem] lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-[var(--color-text-primary)] mb-4">
              Atendimento medico imediato, de qualquer lugar
            </h1>
            <p className="text-[var(--color-text-secondary)] text-[15px] leading-relaxed mb-8 max-w-[480px]">
              Consulte-se com medicos qualificados por videochamada. Receba receitas, atestados e pedidos de exames digitais com validade legal.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/patient/payment')}
                className="btn-primary text-[14px] py-2.5 px-6 gap-2"
              >
                Iniciar Consulta <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/validar')}
                className="btn-secondary text-[14px] py-2.5 px-6 gap-2"
              >
                <FileText size={16} /> Validar Documento
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Users size={20} />} value="24/7" label="Disponibilidade" />
            <StatCard icon={<Video size={20} />} value="HD" label="Videochamada" />
            <StatCard icon={<Shield size={20} />} value="ICP-BR" label="Assinatura Digital" />
            <StatCard icon={<Clock size={20} />} value="< 5 min" label="Tempo de Espera" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[var(--color-bg-white)] border-t border-[var(--color-border)] py-14">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-[1.5rem] font-semibold text-center mb-10 text-[var(--color-text-primary)]">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureStep
              step="01"
              title="Cadastro e Pagamento"
              description="Informe seus dados e realize o pagamento da consulta de forma rapida e segura."
            />
            <FeatureStep
              step="02"
              title="Fila de Espera"
              description="Descreva seus sintomas e aguarde na fila virtual. Um medico ira chama-lo em instantes."
            />
            <FeatureStep
              step="03"
              title="Teleconsulta"
              description="Atendimento por video com emissao de receita, atestado e pedido de exames em PDF."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <BenefitCard icon={<Stethoscope size={18} />} title="Medicos Qualificados" desc="CRM verificado e registro ativo no conselho." />
            <BenefitCard icon={<FileText size={18} />} title="Documentos Digitais" desc="Receitas e atestados com codigo de validacao." />
            <BenefitCard icon={<Shield size={18} />} title="Dados Protegidos" desc="Criptografia e armazenamento seguro LGPD." />
            <BenefitCard icon={<CheckCircle size={18} />} title="Prontuario Eletronico" desc="Historico completo acessivel a qualquer momento." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-[12px] text-[var(--color-text-muted)]">
        MedPronto Telemedicina &mdash; Sistema de Saude Digital
      </footer>
    </div>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="medical-card p-5 flex flex-col gap-2">
    <div className="text-[var(--color-brand)]">{icon}</div>
    <div className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">{value}</div>
    <div className="text-[12px] text-[var(--color-text-secondary)] font-medium">{label}</div>
  </div>
);

const FeatureStep = ({ step, title, description }: { step: string; title: string; description: string }) => (
  <div className="flex flex-col gap-3">
    <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center text-[var(--color-brand)] text-[13px] font-semibold">
      {step}
    </div>
    <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
  </div>
);

const BenefitCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="medical-card p-4 flex flex-col gap-2">
    <div className="w-8 h-8 rounded-md bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-text-secondary)]">
      {icon}
    </div>
    <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h4>
    <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;
