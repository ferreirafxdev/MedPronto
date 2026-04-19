import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, CalendarClock, HeartPulse, ArrowRight, Sparkles, Shield, Activity, Video, Smartphone, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  return (
    <div className="homepage animate-fade-in">
      <section className="hero-section" style={{ minHeight: '80vh', gap: '4rem' }}>
        <div className="hero-content">
          <div className="badge"><Sparkles size={13} /> Saúde Digital de Alta Performance</div>
          <h1 className="hero-title" style={{ fontSize: '3.8rem' }}>
            Atendimento que<br/>
            <span className="text-gradient">Respeita seu Tempo.</span>
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1.2rem', maxWidth: '520px' }}>
            Conecte-se com médicos especialistas em segundos. 
            Consultas por vídeo com prescrição digital e atestado válidos em todo o Brasil.
          </p>
          <div className="hero-buttons">
            {user?.role === 'doctor' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/doctor/dashboard')}>
                <Activity size={18} /> Acessar Painel Médico <ArrowRight size={16} />
              </button>
            ) : user?.role === 'patient' ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')}>
                <Activity size={18} /> Ir para meu Atendimento <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/payment')}>
                  <Video size={18} /> Iniciar Consulta Agora <ArrowRight size={16} />
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/doctor/login')}>
                  <Stethoscope size={18} /> Sou Médico
                </button>
              </>
            )}
          </div>
          
          <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy-dark)' }}>+15k</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atendimentos Realizados</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy-dark)' }}>4.9/5</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média de Avaliação</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy-dark)' }}>24/7</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Médicos Disponíveis</div>
            </div>
          </div>
        </div>

        <div className="hero-image-wrapper" style={{ flex: '1.2' }}>
          <div className="premium-card" style={{ padding: 0, overflow: 'hidden', height: '550px', borderRadius: 'var(--radius-2xl)' }}>
            <img 
              src="/hero_doctor_ultra_realistic_1776640344299.png" 
              alt="Médico Realista MedPronto" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className="floating-card" style={{ bottom: '30px', left: '30px', padding: '1.25rem' }}>
              <div className="doc-avatar" style={{ background: 'var(--accent)' }}><Video size={20} color="white" /></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Consulta em andamento</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conexão estável e segura</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-2xl)', padding: '6rem 2.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '2.5rem', marginBottom: '4rem' }}>
          Tecnologia a favor da sua <span className="text-gradient">Saúde</span>
        </h2>
        
        <div className="bento-grid">
          <div className="bento-item bento-1 premium-card">
            <div>
              <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', margin: '0 0 1.5rem 0' }}>
                <Smartphone size={28} color="var(--accent)" />
              </div>
              <h3>Hospital no Bolso</h3>
              <p>Toda a infraestrutura de um pronto atendimento disponível no seu celular ou computador.</p>
            </div>
            <img src="https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=400" alt="Mobile Heath" style={{ borderRadius: 'var(--radius-md)', marginTop: '1rem', height: '150px', objectFit: 'cover' }} />
          </div>

          <div className="bento-item bento-2 premium-card" style={{ background: 'var(--navy-dark)', color: 'white' }}>
            <div className="icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', margin: '0 0 1rem 0' }}>
              <Shield size={24} color="white" />
            </div>
            <h3 style={{ color: 'white' }}>Segurança de Ponta</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Assinatura digital BirdID e criptografia de ponta a ponta em todos os seus dados médicos.</p>
          </div>

          <div className="bento-item bento-3 premium-card">
            <div className="icon-wrapper" style={{ background: 'var(--violet-light)', margin: '0 0 1rem 0' }}>
              <Clock size={24} color="var(--violet)" />
            </div>
            <h3>Sem Espera</h3>
            <p>Fila virtual inteligente que te avisa exatamente quando o médico está pronto.</p>
          </div>

          <div className="bento-item bento-4 premium-card">
            <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', margin: '0 0 1rem 0' }}>
              <HeartPulse size={24} color="var(--accent)" />
            </div>
            <h3>Receita e Atestado</h3>
            <p>Receba seus documentos digitais válidos imediatamente após o fim da consulta.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
