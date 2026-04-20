import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, CalendarClock, HeartPulse, ArrowRight, ShieldCheck, Activity, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  return (
    <div className="homepage animate-fade-in">
      {/* Search/Validator Quick Portal (Subtle) */}
      <div style={{ position: 'absolute', top: '90px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div 
          onClick={() => navigate('/validar')}
          style={{ 
            padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.8)', 
            backdropFilter: 'blur(10px)', border: '1px solid var(--border)', 
            borderRadius: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <ShieldCheck size={14} color="var(--accent)" /> Possui um atestado? <strong>Validar agora</strong>
        </div>
      </div>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Sua Saúde, <br/>
            <span className="text-gradient">Sem Espera.</span>
          </h1>
          <p className="hero-subtitle">
            Conectamos você aos melhores médicos em minutos. Atendimento digital humano, receitas assinadas e atestados válidos em todo o Brasil.
          </p>
          
          <div className="hero-buttons">
            {user?.role === 'doctor' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/doctor/dashboard')} style={{ borderRadius: '3rem', padding: '0.8rem 2rem' }}>
                Painel do Médico <ArrowRight size={18} />
              </button>
            ) : user?.role === 'patient' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')} style={{ borderRadius: '3rem', padding: '0.8rem 2rem' }}>
                Ir para Consulta <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/login')} style={{ borderRadius: '3rem', padding: '0.8rem 2.5rem' }}>
                   Nova Consulta
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/doctor/login')} style={{ borderRadius: '3rem', padding: '0.8rem 2rem' }}>
                  Acesso Médico
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>5min</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Espera Média</span>
             </div>
             <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>24/7</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Disponibilidade</span>
             </div>
          </div>
        </div>

        <div className="hero-image-wrapper">
          <img 
            src="/minimalist_telemedicine_doctor.png" 
            alt="Atendimento Médico Digital" 
            className="hero-image"
            onError={(e) => {
              // Fallback to the specific generated path if the generic one fails
              e.currentTarget.src = "/minimalist_telemedicine_doctor_1776650249814.png";
            }}
          />
          <div className="floating-card">
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-heading)' }}>Plantão Ativo</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Médicos disponíveis agora</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <Zap size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h3>Agilidade Total</h3>
            <p>Do pagamento à consulta em menos de 10 minutos. Receba seus documentos digitais instantaneamente.</p>
          </div>
          <div className="feature-card">
            <HeartPulse size={24} color="var(--mint)" style={{ marginBottom: '1rem' }} />
            <h3>Cuidado Humano</h3>
            <p>Videochamadas de alta qualidade com clínicos gerais focados em resolver o seu problema com empatia.</p>
          </div>
          <div className="feature-card">
            <ShieldCheck size={24} color="var(--violet)" style={{ marginBottom: '1rem' }} />
            <h3>100% Seguro</h3>
            <p>Seus dados são criptografados e os documentos possuem validade jurídica em todo território nacional.</p>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
