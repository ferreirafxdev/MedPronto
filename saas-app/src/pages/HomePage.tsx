import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, CalendarClock, FileText, HeartPulse } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge">Nova Era da Saúde Digital</div>
          <h1 className="hero-title">
            Atendimento Rápido e Humano, <br/>
            <span className="text-gradient">Onde Você Estiver.</span>
          </h1>
          <p className="hero-subtitle">
            O MedPronto é o seu hospital digital. Diga adeus às filas de espera físicas.
            Acesse médicos qualificados em minutos por videochamada com receita e atestado na mesma hora.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/login')}>
              <User size={20} /> Entrar / Nova Consulta
            </button>
            <button className="btn btn-secondary btn-lg btn-outline" onClick={() => navigate('/doctor/login')}>
              <Stethoscope size={20} /> Sou Médico
            </button>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/hero.png" alt="Telemedicina" className="hero-image" />
          <div className="floating-card flex items-center gap-3">
            <div className="doc-avatar"><Stethoscope size={24} color="#0c4a6e" /></div>
            <div>
              <strong>Dr. Aprovado</strong>
              <span className="text-sm block">Clínico Geral • Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Como o MedPronto cuida de você?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-wrapper bg-blue-100 text-blue-500">
              <CalendarClock size={32} />
            </div>
            <h3>Fila Virtual Inteligente</h3>
            <p>Seu tempo importa. Cadastre-se na triagem e saiba exatamente sua posição na fila do consultório virtual.</p>
          </div>
          <div className="feature-card">
            <div className="icon-wrapper bg-green-100 text-green-500">
              <HeartPulse size={32} />
            </div>
            <h3>Consultas Integradas</h3>
            <p>Videochamada premium com o médico e acesso a abas de exames, tudo em um único lugar seguro.</p>
          </div>
          <div className="feature-card" onClick={() => navigate('/validar')} style={{ cursor: 'pointer' }}>
            <div className="icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-color)' }}>
              <FileText size={32} />
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
