import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, CalendarClock, HeartPulse, ArrowRight, Sparkles, Shield, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  return (
    <div className="homepage">
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge"><Sparkles size={13} /> Nova Era da Saúde Digital</div>
          <h1 className="hero-title">
            Atendimento Rápido<br/>e Humano,{' '}
            <span className="text-gradient">Onde Você Estiver.</span>
          </h1>
          <p className="hero-subtitle">
            O MedPronto é o seu hospital digital. Diga adeus às filas de espera físicas.
            Acesse médicos qualificados em minutos por videochamada com receita e atestado na mesma hora.
          </p>
          <div className="hero-buttons">
            {user?.role === 'doctor' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/doctor/dashboard')}>
                <Activity size={17} /> Minha Fila (Dashboard) <ArrowRight size={15} />
              </button>
            ) : user?.role === 'patient' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')}>
                <Activity size={17} /> Meu Atendimento <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/login')}>
                  <User size={17} /> Nova Consulta <ArrowRight size={15} />
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/doctor/login')}>
                  <Stethoscope size={17} /> Sou Médico
                </button>
              </>
            )}
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/hero.png" alt="Telemedicina" className="hero-image" />
          <div className="floating-card">
            <div className="doc-avatar"><Stethoscope size={20} color="var(--accent)" /></div>
            <div>
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.85rem' }}>Dr. Aprovado</strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Clínico Geral • <span style={{ color: 'var(--mint)' }}>Online</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Como o <span className="text-gradient">MedPronto</span> cuida de você?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)' }}>
              <CalendarClock size={26} color="var(--accent)" />
            </div>
            <h3>Fila Virtual Inteligente</h3>
            <p>Seu tempo importa. Cadastre-se na triagem e saiba exatamente sua posição na fila do consultório virtual.</p>
          </div>
          <div className="feature-card">
            <div className="icon-wrapper" style={{ background: 'var(--mint-light)' }}>
              <HeartPulse size={26} color="var(--mint)" />
            </div>
            <h3>Consultas Integradas</h3>
            <p>Videochamada premium com o médico e acesso a abas de exames, tudo em um único lugar seguro.</p>
          </div>
          <div className="feature-card" onClick={() => navigate('/validar')} style={{ cursor: 'pointer' }}>
            <div className="icon-wrapper" style={{ background: 'var(--violet-light)' }}>
              <Shield size={26} color="var(--violet)" />
            </div>
            <h3>Validação de Documentos</h3>
            <p>Empresas podem validar a autenticidade de atestados emitidos pela MedPronto em segundos.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
