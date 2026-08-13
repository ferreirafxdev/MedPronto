import { Outlet } from 'react-router-dom';
import { Heart, CheckCircle, Clock, Shield } from 'lucide-react';

/**
 * AuthLayout — Layout de tela dividida para as páginas de autenticação.
 *
 * Estrutura:
 *  - Esquerda (.auth-panel-left): painel decorativo com gradiente azul, visível apenas
 *    em telas ≥ 1024px. Exibe logo, proposta de valor e cards de estatísticas.
 *  - Direita (.auth-panel-right): área do formulário, centra o <Outlet />.
 *
 * Em mobile (< 1024px) o painel esquerdo é ocultado via CSS e o form ocupa a tela toda.
 */
const AuthLayout = () => {
  return (
    <div className="auth-split">

      {/* ── PAINEL ESQUERDO — DECORATIVO ──────────────────────────────────────
          Visível apenas em desktop (lg). Contém:
          - Logo + tagline
          - 3 cards de destaque da plataforma (glassmorphism)
          - Rodapé com aviso legal
          Os orbs animados (::before / ::after) são adicionados via CSS puro.
      */}
      <div className="auth-panel-left">

        {/* Camada de conteúdo acima dos orbs CSS (z-index relativo) */}
        <div className="relative z-10 flex flex-col h-full justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Heart size={20} color="white" fill="white" strokeWidth={0} />
            </div>
            <div>
              <div className="text-white font-bold text-[17px] leading-tight">MedPronto</div>
              <div className="text-blue-200 text-[11px]">Telemedicina Digital</div>
            </div>
          </div>

          {/* Proposta de valor central */}
          <div>
            <h1 className="text-white text-[2rem] font-bold leading-[1.2] tracking-tight mb-4">
              Saúde de qualidade,<br />onde você estiver.
            </h1>
            <p className="text-blue-100 text-[14px] leading-relaxed mb-8 max-w-[320px]">
              Consultas médicas online com emissão de receitas e atestados digitais com validade legal.
            </p>

            {/* Cards de estatística com glassmorphism */}
            <div className="space-y-3">
              <StatHighlight
                icon={<CheckCircle size={16} />}
                title="Médicos verificados"
                desc="CRM e CFM ativos conferidos"
              />
              <StatHighlight
                icon={<Clock size={16} />}
                title="Atendimento em menos de 5 min"
                desc="Fila inteligente por ordem de chegada"
              />
              <StatHighlight
                icon={<Shield size={16} />}
                title="Documentos com validade legal"
                desc="Assinatura ICP-Brasil certificada"
              />
            </div>
          </div>

          {/* Rodapé do painel */}
          <p className="text-blue-200/60 text-[11px]">
            MedPronto Telemedicina &mdash; Plataforma regulamentada pelo CFM
          </p>
        </div>
      </div>

      {/* ── PAINEL DIREITO — FORMULÁRIO ────────────────────────────────────────
          Ocupa toda a tela em mobile; 55% em desktop.
          Centraliza verticalmente o formulário via flexbox.
          O <Outlet /> renderiza a LoginPage (ou outra página de auth futura).
      */}
      <div className="auth-panel-right">
        {/* Header mobile: exibido apenas quando o painel esquerdo está oculto */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
            <Heart size={15} color="white" fill="white" strokeWidth={0} />
          </div>
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">MedPronto</span>
        </div>

        {/* Conteúdo da rota (LoginPage) */}
        <Outlet />

        {/* Rodapé */}
        <p className="mt-8 text-[11.5px] text-[var(--color-text-muted)] text-center">
          MedPronto Telemedicina &mdash; Sistema de Saúde Digital
        </p>
      </div>
    </div>
  );
};

/**
 * StatHighlight — Card de destaque glassmorphism para o painel esquerdo.
 * Usa a classe .auth-stat-card definida no index.css.
 */
const StatHighlight = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="auth-stat-card flex items-start gap-3">
    {/* Ícone com fundo semi-transparente */}
    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 text-white mt-0.5">
      {icon}
    </div>
    <div>
      <div className="text-white text-[13px] font-semibold leading-tight">{title}</div>
      <div className="text-blue-200 text-[11.5px] mt-0.5">{desc}</div>
    </div>
  </div>
);

export default AuthLayout;
