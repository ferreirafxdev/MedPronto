import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Heart, ArrowRight, Shield, Clock, Video,
  FileText, CheckCircle, Users, Stethoscope, Activity
} from 'lucide-react';

/**
 * HomePage — Página pública de entrada do MedPronto.
 *
 * Responsabilidades:
 *  1. Redirecionar automaticamente usuários já autenticados para o dashboard correto.
 *  2. Exibir a landing page com hero, estatísticas, fluxo de uso e benefícios.
 *  3. Oferecer os CTAs de entrada para Paciente e Área Médica.
 */
const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  // Se o usuário já está logado (token salvo no Zustand + localStorage),
  // redireciona direto para o dashboard conforme a role, sem renderizar a landing.
  if (user) {
    const dashPath =
      user.role === 'doctor'
        ? '/doctor/dashboard'
        : user.role === 'admin'
        ? '/admin/dashboard'
        : '/patient/dashboard';
    navigate(dashPath, { replace: true }); // replace: true evita que a landing fique no histórico
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">

      {/* ── HEADER ──────────────────────────────────────────────────────────
          Barra de navegação fixa no topo com logo e botões de acesso rápido.
          - "Paciente" → fluxo de pagamento (pré-requisito para consulta)
          - "Área Médica" → login de médico/admin
      */}
      <header className="h-[56px] flex items-center justify-between px-6 lg:px-12 border-b border-[var(--color-border)] bg-[var(--color-bg-white)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
            <Heart size={16} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            MedPronto
          </span>
        </div>

        {/* Navegação: dois acessos distintos por role */}
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

      {/* ── HERO SECTION ────────────────────────────────────────────────────
          Seção principal da landing.
          - Lado esquerdo: proposta de valor + dois CTAs principais
          - Lado direito: grid de 4 StatCards com métricas da plataforma
      */}
      <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Texto de apresentação e CTAs */}
          <div>
            {/* Badge de categoria */}
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
              {/* CTA principal: inicia o fluxo de pagamento → cadastro → fila */}
              <button
                onClick={() => navigate('/patient/payment')}
                className="btn-primary text-[14px] py-2.5 px-6 gap-2"
              >
                Iniciar Consulta <ArrowRight size={16} />
              </button>

              {/* CTA secundário: valida documentos emitidos (receitas/atestados) */}
              <button
                onClick={() => navigate('/validar')}
                className="btn-secondary text-[14px] py-2.5 px-6 gap-2"
              >
                <FileText size={16} /> Validar Documento
              </button>
            </div>
          </div>

          {/* Grid de métricas rápidas (StatCards) */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Users size={20} />} value="24/7" label="Disponibilidade" />
            <StatCard icon={<Video size={20} />} value="HD" label="Videochamada" />
            <StatCard icon={<Shield size={20} />} value="ICP-BR" label="Assinatura Digital" />
            <StatCard icon={<Clock size={20} />} value="< 5 min" label="Tempo de Espera" />
          </div>
        </div>
      </section>

      {/* ── FEATURES — "COMO FUNCIONA" ──────────────────────────────────────
          Explica o fluxo de 3 passos para o paciente:
          Pagamento → Fila de espera → Teleconsulta
      */}
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

      {/* ── BENEFITS ────────────────────────────────────────────────────────
          Grid de 4 cards destacando diferenciais da plataforma:
          médicos verificados, documentos digitais, LGPD e prontuário eletrônico.
      */}
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

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-[12px] text-[var(--color-text-muted)]">
        MedPronto Telemedicina &mdash; Sistema de Saude Digital
      </footer>
    </div>
  );
};

/* ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
   Componentes locais (não exportados) usados apenas nesta página.
   São mantidos neste arquivo por serem simples e específicos da landing.
*/

/**
 * StatCard — Card de métrica para o grid do hero.
 * Exibe ícone, valor em destaque e legenda.
 */
const StatCard = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) => (
  <div className="medical-card p-5 flex flex-col gap-2">
    <div className="text-[var(--color-brand)]">{icon}</div>
    <div className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">{value}</div>
    <div className="text-[12px] text-[var(--color-text-secondary)] font-medium">{label}</div>
  </div>
);

/**
 * FeatureStep — Card numerado de passo do fluxo "Como funciona".
 * Recebe o número do passo (ex: "01"), título e descrição.
 */
const FeatureStep = ({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col gap-3">
    {/* Badge numérico do passo */}
    <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center text-[var(--color-brand)] text-[13px] font-semibold">
      {step}
    </div>
    <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
  </div>
);

/**
 * BenefitCard — Card de benefício/diferencial da plataforma.
 * Ícone + título + descrição curta.
 */
const BenefitCard = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="medical-card p-4 flex flex-col gap-2">
    <div className="w-8 h-8 rounded-md bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-text-secondary)]">
      {icon}
    </div>
    <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h4>
    <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;
