import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, CalendarClock, HeartPulse, ArrowRight, Sparkles, Shield, Activity, Video, Smartphone, Clock, Search, ShieldCheck, CheckCircle, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [valCode, setValCode] = useState('');

  const handleQuickValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (valCode.trim()) {
      navigate(`/validar?code=${valCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="homepage animate-fade-in">
      {/* Hero Section: The "Life Perspective" Overhaul */}
      <section className="hero-section" style={{ minHeight: '90vh', padding: '120px 0 60px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)', zIndex: -1 }} />
        
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '4rem', alignItems: 'center' }}>
          <div className="hero-content">
            <div className="badge" style={{ animation: 'fadeInDown 0.8s' }}>
                <Sparkles size={13} /> O Futuro da Saúde, Agora.
            </div>
            <h1 className="hero-title" style={{ fontSize: '4.2rem', lineHeight: '1.1', marginBottom: '1.5rem', animation: 'fadeInUp 0.6s' }}>
                Saúde Digital que <br/>
                <span className="text-gradient">Transforma Vidas.</span>
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '560px', marginBottom: '2.5rem', animation: 'fadeInUp 0.8s' }}>
                Atendimento médico instantâneo com a segurança da assinatura digital BirdID. 
                Sua saúde em alta performance, de qualquer lugar, a qualquer hora.
            </p>

            {/* Quick Actions & Validator Integration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeInUp 1s' }}>
              <div className="hero-buttons">
                {user ? (
                  <button className="btn btn-primary btn-lg" onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : `/${user.role}/dashboard`)}>
                    Acessar meu Painel <ArrowRight size={18} />
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/payment')}>
                      <Video size={18} /> Iniciar Consulta Agora
                    </button>
                    <button className="btn btn-outline btn-lg" onClick={() => navigate('/doctor/login')}>
                      Sou Médico
                    </button>
                  </>
                )}
              </div>

              {/* Integrated Homepage Validator */}
              <div className="iridescent-card" style={{ padding: '1.5rem', maxWidth: '500px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <ShieldCheck size={20} color="var(--accent)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-dark)' }}>VALIDAÇÃO RÁPIDA DE DOCUMENTOS</span>
                </div>
                <form onSubmit={handleQuickValidate} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Insira o código (ex: MP-R-...)"
                            value={valCode}
                            onChange={(e) => setValCode(e.target.value)}
                            style={{ height: '42px', fontSize: '0.85rem' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem' }}>
                        Validar <ArrowRight size={16} />
                    </button>
                </form>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Verifique receitas, atestados e exames emitidos pela MedPronto em tempo real.
                </p>
              </div>
            </div>
          </div>

          <div className="hero-image-area" style={{ animation: 'fadeInRight 1s' }}>
            <div className="iridescent-card" style={{ padding: 0, height: '600px', border: 'none', boxShadow: '0 40px 80px rgba(0,0,0,0.15)' }}>
               <img src="/hero_premium.png" alt="MedPronto Premium" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               <div className="floating-card" style={{ top: '40px', right: '-20px', padding: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--mint-light)', borderRadius: '50%' }}><Shield size={20} color="var(--mint)" /></div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>Segurança Vital</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assinatura Digital Ativa</span>
                  </div>
               </div>
               <div className="floating-card" style={{ bottom: '40px', left: '-20px', padding: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--accent-ultra-light)', borderRadius: '50%' }}><Activity size={20} color="var(--accent)" /></div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>Médicos Online</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Atendimento em segundos</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Bento Section */}
      <section className="features-section" style={{ padding: '80px 0', background: 'var(--bg-base)' }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem' }}>Sua Saúde, <span className="text-gradient">Redefinida.</span></h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>Combinamos medicina de elite com tecnologia de ponta para oferecer a jornada de cuidado mais ágil do Brasil.</p>
        </div>

        <div className="container">
          <div className="bento-grid">
            <div className="bento-item bento-featured iridescent-card" style={{ padding: '2.5rem' }}>
              <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', marginBottom: '2rem' }}>
                <Video size={32} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Telemedicina de Alta Performance</h3>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Vídeo em 4K e som cristalino para consultas que parecem presenciais. 
                Nossa infraestrutura WebRTC garante 99.9% de disponibilidade mesmo em conexões instáveis.
              </p>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>Latência Zero</span>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>Criptografia AES-256</span>
              </div>
            </div>

            <div className="bento-item bento-tall iridescent-card" style={{ padding: '2rem', background: 'var(--navy-dark)', color: 'white', border: 'none' }}>
              <div className="icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
                <Smartphone size={24} color="white" />
              </div>
              <h3 style={{ color: 'white' }}>Auditável em Todo Lugar</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                Qualquer farmácia ou RH pode validar seus documentos instantaneamente via QR Code ou código rastreável.
              </p>
              <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.65rem', marginBottom: '0.5rem', opacity: 0.6 }}>CÓDIGO DE EXEMPLO</div>
                <div style={{ fontStyle: 'italic', fontSize: '1.1rem', letterSpacing: '0.1em' }}>MP-R-XJ48D2L9</div>
              </div>
            </div>

            <div className="bento-item iridescent-card" style={{ padding: '2rem' }}>
              <div className="icon-wrapper" style={{ background: 'var(--mint-light)', marginBottom: '1.5rem' }}>
                <CheckCircle size={24} color="var(--mint)" />
              </div>
              <h3>BirdID</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assinatura eletrônica ICP-Brasil com validade jurídica incontestável.</p>
            </div>

            <div className="bento-item iridescent-card" style={{ padding: '2rem' }}>
              <div className="icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.1)', marginBottom: '1.5rem' }}>
                <Clock size={24} color="var(--coral)" />
              </div>
              <h3>Espera Mínima</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fila inteligente que prioriza seu conforto. Média de espera inferior a 5 minutos.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
