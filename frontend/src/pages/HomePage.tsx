import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
  Heart,
  MessageSquare,
  Users,
  Star,
  Quote
} from 'lucide-react';
import { useStore } from '../store/useStore';

// Componente nativo de contagem progressiva (Count-Up) baseado em Viewport para acessibilidade e performance
const AnimatedCounter = ({ targetValue, suffix = "", duration = 1500 }: { targetValue: string; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let startTimestamp: number | null = null;
          
          // Extrai a parte numérica (ex: "100" de "100k", ou "4.9" de "4.9/5")
          const numericPart = parseFloat(targetValue.replace(/[^\d.]/g, ''));
          const isDecimal = targetValue.includes('.');

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Easing suave (ease-out quad)
            const easeProgress = progress * (2 - progress);
            const currentVal = easeProgress * numericPart;

            if (isDecimal) {
              setCount(parseFloat(currentVal.toFixed(1)));
            } else {
              setCount(Math.floor(currentVal));
            }

            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              setCount(numericPart);
            }
          };
          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [targetValue, duration]);

  // Reconstrói a string com formato apropriado (ex: "100k" ou "4.9/5")
  const renderValue = () => {
    if (targetValue.toLowerCase().includes('k')) {
      return `${count}k`;
    }
    if (targetValue.includes('/5')) {
      return `${count}/5`;
    }
    return count;
  };

  return <span ref={elementRef}>{renderValue()}{suffix}</span>;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  const steps = [
    {
      icon: <CreditCard className="text-accent" size={32} />,
      title: "Pagamento Rápido",
      desc: "Inicie seu atendimento com pagamento via PIX simplificado e seguro."
    },
    {
      icon: <Monitor className="text-accent" size={32} />,
      title: "Teleconsulta Premium",
      desc: "Conecte-se com um médico especialista de elite em poucos minutos."
    },
    {
      icon: <FileText className="text-accent" size={32} />,
      title: "Documentos Digitais",
      desc: "Receba receitas, atestados e pedidos de exame com assinatura eletrônica CFM."
    }
  ];

  const testimonials = [
    {
      name: "Mariana Silva",
      city: "São Paulo - SP",
      text: "Atendimento de elite! Em menos de 10 minutos eu já estava em consulta com uma excelente médica. A receita digital chegou direto no meu WhatsApp.",
      stars: 5,
      avatar: "MS"
    },
    {
      name: "Carlos Eduardo",
      city: "Belo Horizonte - MG",
      text: "Muito prático e seguro. Precisei de um atestado médico no meu trabalho, passei pela teleconsulta e consegui validar a autenticidade do documento na hora.",
      stars: 5,
      avatar: "CE"
    },
    {
      name: "Dra. Beatriz Santos",
      city: "Curitiba - PR",
      text: "Como médica na plataforma, estou impressionada com a fluidez. O prontuário, a segurança de dados e a geração de receitas CFM são excelentes.",
      stars: 5,
      avatar: "BS"
    }
  ];

  return (
    <div className="homepage animate-fade-in focus-ring" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      
      {/* Banner de Validação com Melhoria de Contraste e Acessibilidade */}
      <div style={{ position: 'fixed', top: '90px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' }}>
        <button 
          onClick={() => navigate('/validar')}
          className="glass focus-ring"
          style={{ 
            padding: '0.65rem 1.5rem', 
            borderRadius: '2rem', 
            fontSize: '0.85rem', 
            color: 'var(--text-heading)',
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            boxShadow: 'var(--shadow-lg)', 
            transition: 'all 0.3s var(--ease)',
            pointerEvents: 'auto',
            border: '1.5px solid var(--border-accent)',
            fontWeight: 600
          }}
          aria-label="Validar autenticidade de atestado médico"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          }}
        >
          <div style={{ background: 'var(--accent-ultra-light)', padding: '5px', borderRadius: '50%' }}>
            <ShieldCheck size={18} className="text-accent" />
          </div>
          <span>Possui um atestado? <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>Validar autenticidade</strong></span>
        </button>
      </div>

      {/* Hero Section Premium com Gradiente Suave de Fundo */}
      <section 
        className="hero-section flex flex-col lg:flex-row items-center gap-12 lg:gap-16 px-6 md:px-12 max-w-7xl mx-auto" 
        style={{ 
          minHeight: '92vh', 
          paddingTop: '170px',
          paddingBottom: '80px',
          background: 'linear-gradient(180deg, #f0f5ff 0%, #f8fafc 50%, #ffffff 100%)',
          width: '100%'
        }}
      >
        {/* Lado Esquerdo: Conteúdo Textual */}
        <div className="hero-content flex-1 text-center lg:text-left z-10">
          <div className="animate-scale-in inline-flex items-center gap-2 bg-blue-50 border border-blue-200/50 px-4 py-1.5 rounded-full mb-6 shadow-sm">
            <Activity size={16} className="text-accent" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Atendimento 24/7 Ativo e Homologado
            </span>
          </div>
          
          <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-none text-[#020617]">
            Saúde de Elite <br/>
            No Seu <span style={{ color: 'var(--accent)' }}>Smartphone.</span>
          </h1>
          
          <p className="hero-subtitle text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 mb-8 text-[#1e293b] font-semibold leading-relaxed">
            Conectamos você aos melhores médicos do Brasil em minutos. Tecnologia de ponta, atendimento altamente humanizado e documentos digitais com plena validade jurídica.
          </p>
          
          <div className="hero-buttons flex flex-wrap gap-4 justify-center lg:justify-start">
            {user?.role === 'doctor' ? (
              <button 
                className="btn btn-primary btn-lg focus-ring font-extrabold" 
                onClick={() => navigate('/doctor/dashboard')} 
                style={{ padding: '1.25rem 2.5rem', borderRadius: '1rem', fontSize: '1.1rem' }}
                aria-label="Acessar o Painel Médico"
              >
                Entrar no Painel <ArrowRight size={20} />
              </button>
            ) : user?.role === 'patient' ? (
              <button 
                className="btn btn-primary btn-lg focus-ring font-extrabold" 
                onClick={() => navigate('/patient/dashboard')} 
                style={{ padding: '1.25rem 2.5rem', borderRadius: '1rem', fontSize: '1.1rem' }}
                aria-label="Acessar Agenda de Consultas"
              >
                Agenda de Consultas <ArrowRight size={20} />
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-primary btn-lg focus-ring font-extrabold animate-pulse-cta" 
                  onClick={() => navigate('/patient/login')} 
                  style={{ 
                    padding: '1.25rem 3rem', 
                    borderRadius: '1rem', 
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  aria-label="Falar com Médico Agora via Telemedicina"
                >
                  <MessageSquare size={20} fill="white" />
                  Falar com Médico Agora
                </button>
                <button 
                  className="btn btn-outline btn-lg focus-ring font-extrabold" 
                  onClick={() => navigate('/doctor/login')} 
                  style={{ 
                    padding: '1.25rem 2.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  aria-label="Acesso profissional para médicos cadastrados"
                >
                  <Stethoscope size={20} className="text-accent" />
                  Acesso Profissional
                </button>
              </>
            )}
          </div>

          {/* Badges do Mobile: Visíveis apenas em telas pequenas como Pills horizontais */}
          <div className="flex md:hidden flex-wrap justify-center gap-3 mt-10">
            <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
              <CheckCircle size={14} className="text-emerald-600" /> Certificação CFM
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
              <Zap size={14} className="text-accent" /> Resultado Rápido
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 bg-[#f8fafc] text-slate-800 text-xs font-bold rounded-full border border-slate-200">
              <ShieldCheck size={14} className="text-accent" /> Proteção LGPD
            </span>
          </div>
        </div>
 
        {/* Lado Direito: Imagem e Badges (Escondidos em telas < 768px por UX de Saúde Digital) */}
        <div className="hidden md:block hero-image-wrapper flex-1 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src="/hero_doctor_realistic.png" 
              alt="Médico Sorridente Oferecendo Teleconsulta Premium" 
              className="hero-image"
              style={{ 
                borderRadius: '2.5rem', 
                boxShadow: 'var(--shadow-2xl)', 
                border: '8px solid white',
                transform: 'perspective(1000px) rotateY(-5deg)',
                width: '100%',
                maxWidth: '480px',
                height: 'auto'
              }}
            />

            {/* BADGE 1: Certificação CFM (Slide suave da direita) */}
            <div className="glass animate-float animate-slide-in-right" style={{ position: 'absolute', top: '10%', right: '-30px', padding: '1rem', borderRadius: '1.25rem', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '12px' }}>
                <CheckCircle color="#059669" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#065f46' }}>Certificação CFM</div>
                <div style={{ fontSize: '0.7rem', color: '#059669', opacity: 0.9, fontWeight: 600 }}>100% Homologado</div>
              </div>
            </div>

            {/* BADGE 2: Resultado Rápido (Slide suave da esquerda) */}
            <div className="glass-dark animate-float animate-slide-in-left" style={{ animationDelay: '0.4s', position: 'absolute', bottom: '20%', left: '-40px', padding: '1.25rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-2xl)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Resultado Rápido</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Documentos e PDFs na Hora</div>
              </div>
            </div>

            {/* BADGE 3: Dados Protegidos LGPD (Novo, slide suave de baixo) */}
            <div className="glass animate-float animate-slide-in-right" style={{ animationDelay: '0.8s', position: 'absolute', top: '55%', right: '-45px', padding: '1rem', borderRadius: '1.25rem', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
                <ShieldCheck color="var(--accent)" size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-dark)' }}>Dados Protegidos</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Criptografia e LGPD</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Estatísticas em Cards Premium com Count-Up Integrado */}
      <section className="px-6 md:px-12 py-12 bg-white border-t border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            
            {/* Card 1 */}
            <div 
              className="premium-card flex flex-row items-center gap-6 p-6 hover:shadow-lg transition-all duration-300 focus-ring"
              style={{ borderLeft: '4px solid var(--accent)' }}
            >
              <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Clock className="text-accent" size={32} />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-[#020617] tracking-tight">
                  <AnimatedCounter targetValue="5" suffix=" min" />
                </div>
                <div className="text-sm font-semibold text-slate-500 mt-1">Espera Média de Triagem</div>
              </div>
            </div>

            {/* Card 2 */}
            <div 
              className="premium-card flex flex-row items-center gap-6 p-6 hover:shadow-lg transition-all duration-300 focus-ring"
              style={{ borderLeft: '4px solid var(--success)' }}
            >
              <div className="p-4 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Users className="text-emerald-600" size={32} />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-[#020617] tracking-tight">
                  <AnimatedCounter targetValue="100k" suffix="+" />
                </div>
                <div className="text-sm font-semibold text-slate-500 mt-1">Pacientes Atendidos</div>
              </div>
            </div>

            {/* Card 3 */}
            <div 
              className="premium-card flex flex-row items-center gap-6 p-6 hover:shadow-lg transition-all duration-300 focus-ring"
              style={{ borderLeft: '4px solid var(--amber)' }}
            >
              <div className="p-4 bg-amber-50 rounded-2xl flex items-center justify-center">
                <Star className="text-amber-500" size={32} fill="var(--amber)" />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-[#020617] tracking-tight">
                  <AnimatedCounter targetValue="4.9" suffix="/5" />
                </div>
                <div className="text-sm font-semibold text-slate-500 mt-1">Avaliação dos Pacientes</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Seção 3: Logos de Convênios Parceiros (Escala de Cinza, visual premium) */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#64748b] mb-8">
            Compatível com reembolso e aceito pelos maiores convênios do país
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {/* Unimed Logo */}
            <div className="h-8 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center gap-2">
              <span className="font-black text-xl text-[#006633] tracking-tighter">Uni<span className="text-[#020617]">med</span></span>
            </div>
            {/* Bradesco Saúde Logo */}
            <div className="h-8 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center gap-2">
              <span className="font-extrabold text-xl text-[#cc092f] tracking-tight">Bradesco <span className="font-light text-slate-700">Saúde</span></span>
            </div>
            {/* Amil Logo */}
            <div className="h-8 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center gap-1">
              <span className="font-black text-2xl text-[#005cb9] tracking-tight">a<span className="text-[#0ea5e9]">mil</span></span>
            </div>
            {/* SulAmérica Logo */}
            <div className="h-8 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center gap-2">
              <span className="font-bold text-xl text-[#003875] tracking-tight">SulAmérica</span>
            </div>
            {/* Porto Seguro Logo */}
            <div className="h-8 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center gap-1">
              <span className="font-extrabold text-xl text-[#0054a6] tracking-tight">Porto <span className="font-medium text-slate-700">Seguro</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 4: Como Funciona */}
      <section style={{ padding: '100px 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', fontWeight: 900 }} className="tracking-tight text-[#020617]">
              Como funciona o <span className="text-gradient">MedPronto?</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', fontWeight: 600 }}>
              Simples, ultra rápido e 100% digital. Do pagamento à receita em minutos.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
            {steps.map((step, idx) => (
              <div key={idx} className="premium-card hover:translate-y-[-6px] transition-transform focus-ring" style={{ textAlign: 'center', padding: '3.5rem 2.5rem' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: 'var(--accent-ultra-light)', 
                  borderRadius: '2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 2rem auto',
                  border: '1.5px solid var(--border-accent)'
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', fontWeight: 800 }} className="text-[#020617]">{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.98rem', fontWeight: 500 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 5: Diferenciais Bento Grid */}
      <section style={{ padding: '100px 2rem', background: 'var(--bg-subtle)' }}>
        <div className="bento-grid">
           <div className="bento-item bento-featured iridescent-card focus-ring" style={{ padding: '3rem' }}>
              <div style={{ maxWidth: '450px' }}>
                <div style={{ background: 'var(--accent)', width: '50px', height: '50px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <Stethoscope color="white" size={28} />
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 800 }}>O Padrão Ouro da Telemedicina.</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem', fontWeight: 500, lineHeight: 1.6 }}>
                    Nossa rede exclusiva de médicos especialistas passa por uma rigorosa validação documental e de qualidade para garantir diagnósticos precisos.
                </p>
                <button className="btn btn-primary focus-ring font-extrabold" onClick={() => navigate('/patient/login')}>Iniciar Triagem</button>
              </div>
           </div>
           
           <div className="bento-item premium-card focus-ring">
              <Clock className="text-accent" size={32} style={{ marginBottom: '1.5rem' }} />
              <h3 className="text-lg font-bold text-[#020617]">Disponível Agora</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Médicos de plantão 24 horas por dia, 7 dias por semana, incluindo finais de semana e feriados.</p>
           </div>
           
           <div className="bento-item premium-card focus-ring">
              <Award className="text-accent" size={32} style={{ marginBottom: '1.5rem' }} />
              <h3 className="text-lg font-bold text-[#020617]">Validade Jurídica</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Todas as prescrições são assinadas digitalmente e aceitas em farmácias de todo o Brasil.</p>
           </div>
           
           <div className="bento-item bento-featured glass focus-ring" style={{ background: 'linear-gradient(135deg, var(--navy-dark), #1e293b)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 800 }}>Privacidade Total</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', fontWeight: 500 }}>Seus dados e consultas são 100% criptografados de ponta a ponta em estrita conformidade com a LGPD brasileira.</p>
                  </div>
                  <div style={{ flex: 0.3, display: 'flex', justifyContent: 'flex-end' }}>
                     <ShieldCheck size={90} className="opacity-20 text-white" />
                  </div>
              </div>
           </div>
        </div>
      </section>

      {/* Seção 6: Testemunhos e Depoimentos dos Clientes (Novo, design premium) */}
      <section style={{ padding: '100px 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.25rem', fontWeight: 900 }} className="tracking-tight text-[#020617]">
              O que dizem nossos <span className="text-gradient">Pacientes</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', fontWeight: 600 }}>
              Milhares de vidas transformadas todos os dias através de um atendimento de excelência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, index) => (
              <div 
                key={index}
                className="premium-card flex flex-col justify-between p-8 hover:shadow-xl transition-all duration-300 focus-ring"
                style={{ borderRadius: '1.5rem' }}
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(test.stars)].map((_, i) => (
                      <Star key={i} size={16} fill="var(--amber)" className="text-amber-500" />
                    ))}
                  </div>
                  <p className="text-slate-600 italic text-[0.98rem] leading-relaxed mb-6 font-medium">
                    "{test.text}"
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-100 pt-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}
                  >
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm leading-none">{test.name}</h4>
                    <span className="text-xs text-slate-400 font-semibold mt-1 block">{test.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rodapé da Página */}
      <footer style={{ padding: '4rem 2rem', borderTop: '1px solid var(--border)', background: 'white' }}>
         <div style={{ maxWidth: '1200px', margin: '0 auto', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }} className="flex flex-col md:flex-row justify-between items-center">
            <div className="logo-text">
                <span className="med">Med</span><span className="pronto">Pronto</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }} className="cursor-pointer hover:text-accent transition-colors">Termos de Uso</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }} className="cursor-pointer hover:text-accent transition-colors">Privacidade</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }} className="cursor-pointer hover:text-accent transition-colors">Suporte</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
