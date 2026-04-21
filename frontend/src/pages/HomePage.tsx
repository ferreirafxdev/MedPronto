import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Clock, 
  Award, 
  CheckCircle, 
  CreditCard, 
  Monitor, 
  FileText,
  Activity,
  Heart
} from 'lucide-react';
import { useStore } from '../store/useStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  const steps = [
    {
      icon: <CreditCard className="text-accent" size={32} />,
      title: "Pagamento Rápido",
      desc: "Inicie seu atendimento com pagamento via PIX simplificado."
    },
    {
      icon: <Monitor className="text-accent" size={32} />,
      title: "Teleconsulta",
      desc: "Conecte-se com um médico especialista em poucos minutos."
    },
    {
      icon: <FileText className="text-accent" size={32} />,
      title: "Documentos Digitais",
      desc: "Receba receitas, atestados e pedidos de exame na hora."
    }
  ];

  return (
    <div className="homepage animate-fade-in" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {/* Search/Validator Quick Portal (Floating Glass) */}
      <div style={{ position: 'fixed', top: '90px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}>
        <div 
          onClick={() => navigate('/validar')}
          className="glass"
          style={{ 
            padding: '0.6rem 1.25rem', 
            borderRadius: '2rem', 
            fontSize: '0.8rem', 
            color: 'var(--text-heading)',
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            boxShadow: 'var(--shadow-lg)', 
            transition: 'all 0.3s var(--ease)',
            pointerEvents: 'auto',
            border: '1px solid var(--border-accent)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          }}
        >
          <div style={{ background: 'var(--accent-ultra-light)', padding: '4px', borderRadius: '50%' }}>
            <ShieldCheck size={16} className="text-accent" />
          </div>
          <span>Possui um atestado? <strong style={{ color: 'var(--accent)' }}>Validar autenticidade</strong></span>
        </div>
      </div>

      {/* Cinematic Hero Section */}
      <section className="hero-section" style={{ minHeight: '90vh', padding: '160px 2rem 100px 2rem' }}>
        <div className="hero-content" style={{ zIndex: 2 }}>
          <div className="animate-scale-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-ultra-light)', padding: '0.5rem 1rem', borderRadius: '2rem', marginBottom: '2rem', border: '1px solid var(--border-accent)' }}>
            <Activity size={16} className="text-accent" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atendimento 24/7 Ativo</span>
          </div>
          
          <h1 className="hero-title" style={{ fontSize: '4.5rem', fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
            Saúde de Elite <br/>
            No Seu <span style={{ color: 'var(--accent)' }}>Smartphone.</span>
          </h1>
          
          <p className="hero-subtitle" style={{ fontSize: '1.25rem', maxWidth: '600px', marginBottom: '3rem', color: 'var(--text-body)', fontWeight: 500 }}>
            Conectamos você aos melhores médicos do Brasil em minutos. Tecnologia de ponta, atendimento humano e documentos digitais com validade jurídica.
          </p>
          
          <div className="hero-buttons">
            {user?.role === 'doctor' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/doctor/dashboard')} style={{ padding: '1.25rem 2.5rem', borderRadius: '1rem', fontSize: '1.1rem' }}>
                Entrar no Painel <ArrowRight size={20} />
              </button>
            ) : user?.role === 'patient' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')} style={{ padding: '1.25rem 2.5rem', borderRadius: '1rem', fontSize: '1.1rem' }}>
                Agenda de Consultas <ArrowRight size={20} />
              </button>
            ) : (
              <>
                <button 
                   className="btn btn-primary btn-lg" 
                   onClick={() => navigate('/patient/login')} 
                   style={{ 
                     padding: '1.25rem 3rem', 
                     borderRadius: '1rem', 
                     fontSize: '1.1rem',
                     background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
                     border: 'none'
                   }}
                >
                   Falar com Médico Agora
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/doctor/login')} style={{ padding: '1.25rem 2.5rem', borderRadius: '1rem', fontSize: '1.1rem' }}>
                  Acesso Profissional
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: '4rem', display: 'flex', gap: '3rem' }}>
             <div className="stat-item">
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--navy-dark)' }}>5min</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Espera Média</div>
             </div>
             <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />
             <div className="stat-item">
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--navy-dark)' }}>100k+</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pacientes Atendidos</div>
             </div>
             <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />
             <div className="stat-item">
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--navy-dark)' }}>4.9/5</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avaliação Médica</div>
             </div>
          </div>
        </div>

        <div className="hero-image-wrapper animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src="/hero_doctor_realistic.png" 
              alt="Professional Telemedicine" 
              className="hero-image"
              style={{ 
                borderRadius: '2.5rem', 
                boxShadow: 'var(--shadow-2xl)', 
                border: '8px solid white',
                transform: 'perspective(1000px) rotateY(-5deg)'
              }}
            />
            {/* Realistic Badges */}
            <div className="glass animate-float" style={{ position: 'absolute', top: '10%', right: '-30px', padding: '1rem', borderRadius: '1.25rem', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '12px' }}>
                    <CheckCircle color="#059669" size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#065f46' }}>Certificação CFM</div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', opacity: 0.8 }}>100% Legalizado</div>
                </div>
            </div>

            <div className="glass-dark animate-float" style={{ animationDelay: '1s', position: 'absolute', bottom: '15%', left: '-40px', padding: '1.25rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-2xl)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap className="text-white" size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Resultado Rápido</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Documentos em PDFs via App</div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section style={{ padding: '100px 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Como funciona o <span className="text-gradient">MedPronto?</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Simples, rápido e totalmente digital. Do pagamento à receita em minutos.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem' }}>
            {steps.map((step, idx) => (
              <div key={idx} className="premium-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: 'var(--accent-ultra-light)', 
                  borderRadius: '2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 2rem auto',
                  border: '1px solid var(--border-accent)'
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Differentials Section */}
      <section style={{ padding: '100px 2rem', background: 'var(--bg-subtle)' }}>
        <div className="bento-grid">
           <div className="bento-item bento-featured iridescent-card" style={{ padding: '3rem' }}>
              <div style={{ maxWidth: '400px' }}>
                <div style={{ background: 'var(--accent)', width: '50px', height: '50px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <Stethoscope color="white" size={28} />
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>O Padrão Ouro da Telemedicina.</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                    Nossa rede exclusiva de médicos passa por uma rigorosa validação para garantir diagnósticos precisos e atendimento humanizado.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/patient/login')}>Iniciar Triagem</button>
              </div>
           </div>
           
           <div className="bento-item premium-card">
              <Clock className="text-accent" size={32} style={{ marginBottom: '1.5rem' }} />
              <h3>Disponível Agora</h3>
              <p>Médicos de plantão 24 horas por dia, 7 dias por semana, incluindo feriados.</p>
           </div>
           
           <div className="bento-item premium-card">
              <Award className="text-accent" size={32} style={{ marginBottom: '1.5rem' }} />
              <h3>Validade Jurídica</h3>
              <p>Todas as prescrições são assinadas digitalmente e aceitas em farmácias de todo o Brasil.</p>
           </div>
           
           <div className="bento-item bento-featured glass" style={{ background: 'linear-gradient(135deg, var(--navy-dark), #1e293b)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Privacidade Total</h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Dados criptografados de ponta a ponta seguindo a LGPD.</p>
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                     <ShieldCheck size={100} color="rgba(255,255,255,0.1)" />
                  </div>
              </div>
           </div>
        </div>
      </section>

      <footer style={{ padding: '4rem 2rem', borderTop: '1px solid var(--border)', background: 'white' }}>
         <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="logo-text">
                <span className="med">Med</span><span className="pronto">Pronto</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Termos de Uso</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Privacidade</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Suporte</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                © 2026 MedPronto. Todos os direitos reservados.
            </div>
         </div>
      </footer>

      <style>{`
        .text-gradient {
          background: linear-gradient(135deg, var(--accent), var(--violet));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes rainbow-border {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .iridescent-card::before {
            background-size: 400% 400%;
            animation: rainbow-border 12s ease infinite;
        }
        @media (max-width: 1024px) {
            .hero-title { font-size: 3rem !important; }
            .hero-image { transform: none !important; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
