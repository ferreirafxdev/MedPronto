import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  Loader2, Activity, Clock, FileText,
  PlusCircle, ShieldCheck, HeartPulse, UserCheck,
  MessageSquare, AlertCircle, LogOut, ChevronRight,
  ChevronLeft, Thermometer, Zap, Timer, CheckCircle2
} from 'lucide-react';
import apiClient from '../../api/client';

// ─── Tipos ───
type QueueStep = 1 | 2 | 3;

interface AnamneseData {
  symptoms: string[];
  customSymptom: string;
  duration: string;
  severity: number;
}

const COMMON_SYMPTOMS = [
  { id: 'fever', label: 'Febre', emoji: '🌡️' },
  { id: 'headache', label: 'Dor de Cabeça', emoji: '🤕' },
  { id: 'throat', label: 'Dor de Garganta', emoji: '😷' },
  { id: 'cough', label: 'Tosse', emoji: '😮‍💨' },
  { id: 'body_pain', label: 'Dor no Corpo', emoji: '💪' },
  { id: 'breathing', label: 'Falta de Ar', emoji: '😮' },
  { id: 'nausea', label: 'Náusea/Vômito', emoji: '🤢' },
  { id: 'dizziness', label: 'Tontura', emoji: '😵' },
  { id: 'chest', label: 'Dor no Peito', emoji: '❤️' },
  { id: 'abdomen', label: 'Dor Abdominal', emoji: '🤜' },
];

const DURATION_OPTIONS = [
  { value: 'today', label: 'Hoje', sub: 'menos de 24h' },
  { value: '2-3days', label: '2 a 3 dias', sub: 'esta semana' },
  { value: 'week', label: '1 semana', sub: 'cerca de 7 dias' },
  { value: 'weeks', label: 'Mais de 1 semana', sub: 'crônico/recorrente' },
];

const SEVERITY_LABELS = ['Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso'];
const SEVERITY_COLORS = ['#10b981', '#34d399', '#f59e0b', '#f97316', '#ef4444'];

const PatientDashboard = () => {
  const { user, setUser, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [inQueue, setInQueue] = useState(false);
  const [consultationReady, setConsultationReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enqueueLoading, setEnqueueLoading] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [doctorName, setDoctorName] = useState('');

  // Anamnese multi-step
  const [queueStep, setQueueStep] = useState<QueueStep>(1);
  const [anamneseData, setAnamneseData] = useState<AnamneseData>({
    symptoms: [],
    customSymptom: '',
    duration: '',
    severity: 2
  });

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
      const isNewConsultation = searchParams.get('new_consultation') === 'true' || localStorage.getItem('payment_confirmed') === 'true';
      const isJustRegistered = searchParams.get('just_registered') === 'true';

      if (resp.data.isActive) {
        setInQueue(false);
        setConsultationReady(true);
        setDoctorName(resp.data.doctorName || 'Médico');
        setLoading(false);
        setConsultationRoomId(user.id);
        navigate(`/patient/consultation/${user.id}`, { replace: true });
      } else if (resp.data.inQueue) {
        setInQueue(true);
        setConsultationReady(false);
        setLoading(false);
      } else if (isJustRegistered) {
        const tempComplaint = localStorage.getItem('temp_complaint') || 'Consulta Geral';
        localStorage.removeItem('temp_complaint');
        navigate('/patient/dashboard', { replace: true });
        handleAutoEnqueue(tempComplaint);
      } else if (isNewConsultation) {
        setShowComplaintModal(true);
        setLoading(false);
      } else {
        setInQueue(false);
        setConsultationReady(false);
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  }, [user, searchParams, navigate, setConsultationRoomId]);

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [user, navigate, checkStatus]);

  const buildComplaintText = (): string => {
    const parts: string[] = [];
    const selectedSymptoms = COMMON_SYMPTOMS
      .filter(s => anamneseData.symptoms.includes(s.id))
      .map(s => s.label);

    if (selectedSymptoms.length > 0) parts.push(selectedSymptoms.join(', '));
    if (anamneseData.customSymptom.trim()) parts.push(anamneseData.customSymptom.trim());

    const durationLabel = DURATION_OPTIONS.find(d => d.value === anamneseData.duration)?.label;
    if (durationLabel) parts.push(`há ${durationLabel.toLowerCase()}`);

    const severityLabel = SEVERITY_LABELS[anamneseData.severity - 1];
    if (severityLabel) parts.push(`intensidade: ${severityLabel}`);

    return parts.join(' · ') || 'Consulta Geral';
  };

  const handleAutoEnqueue = async (customComplaint: string) => {
    if (!user) return;
    setEnqueueLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', { id: user.id, name: user.name, complaint: customComplaint });
      if (resp.data.success) {
        setInQueue(true);
        localStorage.removeItem('payment_confirmed');
      }
    } catch (e: any) {
      if (e.response?.status === 402 || e.response?.data?.requiresPayment) {
        setRequiresPayment(true);
      } else {
        alert(e.response?.data?.error || 'Erro ao entrar na fila.');
      }
    } finally {
      setEnqueueLoading(false);
    }
  };

  const handleEnqueueFinal = async () => {
    if (!user) return;
    setEnqueueLoading(true);
    const complaint = buildComplaintText();
    try {
      const resp = await apiClient.post('/api/enqueue', { id: user.id, name: user.name, complaint });
      if (resp.data.success) {
        setInQueue(true);
        setShowComplaintModal(false);
        localStorage.removeItem('payment_confirmed');
      }
    } catch (e: any) {
      if (e.response?.status === 402 || e.response?.data?.requiresPayment) {
        setRequiresPayment(true);
        setShowComplaintModal(false);
      } else {
        alert(e.response?.data?.error || 'Erro ao entrar na fila.');
      }
    } finally {
      setEnqueueLoading(false);
    }
  };

  const toggleSymptom = (id: string) => {
    setAnamneseData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(id)
        ? prev.symptoms.filter(s => s !== id)
        : [...prev.symptoms, id]
    }));
  };

  const handleLogout = () => { setUser(null); localStorage.clear(); navigate('/'); };

  const canProceedStep1 = anamneseData.symptoms.length > 0 || anamneseData.customSymptom.trim().length > 0;
  const canProceedStep2 = anamneseData.duration !== '';

  if (!user || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} color="#3b82f6" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
      color: 'white',
      fontFamily: '"Inter", sans-serif',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* ─── Header ─── */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
            borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)'
          }}>
            <HeartPulse size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>MedPronto</h1>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>PAINEL DO PACIENTE</span>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8', padding: '0.5rem 0.85rem', borderRadius: '0.65rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700
        }}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main style={{ flex: 1, maxWidth: '640px', width: '100%', margin: '0 auto', padding: '1.5rem', boxSizing: 'border-box' }}>

        {/* Boas-vindas */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
            PRONTO SOCORRO VIRTUAL
          </div>
          <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 900 }}>
            Olá, <span style={{ background: 'linear-gradient(135deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {user.name.split(' ')[0]}
            </span> 👋
          </h2>
        </div>

        {/* Pagamento pendente */}
        {requiresPayment && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem',
            display: 'flex', gap: '1rem', alignItems: 'flex-start'
          }}>
            <AlertCircle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: 0, color: '#fecdd3', fontSize: '1rem', fontWeight: 800 }}>Novo Atendimento Requer Pagamento</h4>
              <p style={{ margin: '0.4rem 0 0', color: '#fda4af', fontSize: '0.85rem', lineHeight: 1.4 }}>
                Seu atendimento anterior foi finalizado. Para consultar novamente, realize um novo pagamento.
              </p>
              <button onClick={() => navigate('/patient/payment')} style={{
                marginTop: '0.85rem', background: '#ef4444', color: 'white', border: 'none',
                padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}>
                Pagar Nova Consulta (R$ 50,00)
              </button>
            </div>
          </div>
        )}

        {/* Estado 1: Idle — Iniciar Atendimento */}
        {!inQueue && !consultationReady && !requiresPayment && (
          <div style={{
            background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(12px)',
            borderRadius: '1.5rem', padding: '1.75rem',
            border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(56,189,248,0.1))',
                border: '1px solid rgba(56,189,248,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <HeartPulse size={24} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Médicos disponíveis agora</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s infinite' }} />
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>ONLINE · Atendimento Imediato</span>
                </div>
              </div>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', margin: '0 0 1.5rem' }}>
              Telemedicina com atestados, receitas e orientação médica. Consulta 100% digital, sem filas presenciais.
            </p>

            <button onClick={() => { setQueueStep(1); setShowComplaintModal(true); }} className="btn-primary-action">
              <PlusCircle size={20} /> Iniciar Atendimento
            </button>
          </div>
        )}

        {/* Estado 2: Na Fila */}
        {inQueue && !consultationReady && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
            borderRadius: '1.5rem', padding: '2rem 1.5rem',
            border: '1px solid rgba(56,189,248,0.3)',
            marginBottom: '1.5rem', textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Efeito de fundo animado */}
            <div style={{
              position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(56,189,248,0.12)', border: '2px solid rgba(56,189,248,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', color: '#38bdf8',
              animation: 'pulse-ring 2.5s ease-in-out infinite'
            }}>
              <Clock size={34} />
            </div>

            <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 900, color: 'white' }}>
              Você está na Fila de Espera
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Mantenha esta tela aberta. Assim que o médico te chamar, você será redirecionado automaticamente.
            </p>

            <div style={{
              marginTop: '1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem'
            }}>
              {[
                { icon: <Activity size={16} />, label: 'Tempo Real', color: '#38bdf8' },
                { icon: <ShieldCheck size={16} />, label: 'Seguro', color: '#10b981' },
                { icon: <Timer size={16} />, label: 'Monitorando', color: '#a78bfa' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  color: item.color, fontSize: '0.75rem', fontWeight: 700
                }}>
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado 3: Médico chamou */}
        {consultationReady && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,78,59,0.4))',
            borderRadius: '1.5rem', padding: '2rem 1.5rem',
            border: '2px solid #10b981', marginBottom: '1.5rem',
            textAlign: 'center', boxShadow: '0 20px 30px rgba(16,185,129,0.3)',
            animation: 'fadeIn 0.4s ease'
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', color: 'white', boxShadow: '0 0 30px #10b981'
            }}>
              <UserCheck size={38} />
            </div>
            <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 900, color: 'white' }}>O Médico Chamou Você!</h3>
            <p style={{ color: '#a7f3d0', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Dr(a). {doctorName} iniciou seu atendimento. Conectando agora...
            </p>
            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#10b981', fontWeight: 700 }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Conectando à sala de consulta...
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { label: 'Meu Histórico', sub: 'Receitas e atestados', icon: <FileText size={22} />, color: '#60a5fa', bg: 'rgba(37,99,235,0.12)', path: '/patient/profile' },
            { label: 'Nova Consulta', sub: 'Teleconsulta 24h', icon: <ShieldCheck size={22} />, color: '#34d399', bg: 'rgba(16,185,129,0.12)', path: '/patient/payment' },
          ].map((card, i) => (
            <div key={i} onClick={() => navigate(card.path)} className="card-nav">
              <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, marginBottom: '0.85rem' }}>
                {card.icon}
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{card.label}</h4>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>{card.sub}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ─── Modal Multi-Step de Anamnese ─── */}
      {showComplaintModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.92)',
          backdropFilter: 'blur(16px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            maxWidth: '480px', width: '100%',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', height: '3px' }}>
              <div style={{
                height: '100%',
                width: `${(queueStep / 3) * 100}%`,
                background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <MessageSquare size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>
                    {queueStep === 1 && 'O que você está sentindo?'}
                    {queueStep === 2 && 'Há quanto tempo?'}
                    {queueStep === 3 && 'Qual a intensidade?'}
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  {queueStep}/3
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                {queueStep === 1 && 'Selecione os sintomas ou descreva o que está sentindo'}
                {queueStep === 2 && 'Isso ajuda o médico a entender a urgência'}
                {queueStep === 3 && 'De 1 (muito leve) a 5 (muito intenso)'}
              </p>
            </div>

            {/* Conteúdo das etapas */}
            <div style={{ padding: '1.25rem 1.5rem' }}>

              {/* Step 1: Sintomas */}
              {queueStep === 1 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {COMMON_SYMPTOMS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleSymptom(s.id)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '0.75rem',
                          border: `1px solid ${anamneseData.symptoms.includes(s.id) ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          background: anamneseData.symptoms.includes(s.id)
                            ? 'rgba(56,189,248,0.15)'
                            : 'rgba(255,255,255,0.03)',
                          color: anamneseData.symptoms.includes(s.id) ? '#38bdf8' : '#94a3b8',
                          cursor: 'pointer', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          fontSize: '0.82rem', transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                      >
                        <span>{s.emoji}</span> {s.label}
                        {anamneseData.symptoms.includes(s.id) && <CheckCircle2 size={12} style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Descreva outro sintoma ou detalhe..."
                    value={anamneseData.customSymptom}
                    onChange={e => setAnamneseData(prev => ({ ...prev, customSymptom: e.target.value }))}
                    style={{
                      width: '100%', background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '0.75rem', padding: '0.75rem 1rem',
                      color: 'white', fontSize: '0.9rem', outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'Inter, sans-serif'
                    }}
                  />
                </div>
              )}

              {/* Step 2: Duração */}
              {queueStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setAnamneseData(prev => ({ ...prev, duration: d.value }))}
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderRadius: '0.85rem',
                        border: `1px solid ${anamneseData.duration === d.value ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        background: anamneseData.duration === d.value
                          ? 'rgba(56,189,248,0.12)'
                          : 'rgba(255,255,255,0.03)',
                        color: 'white', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: anamneseData.duration === d.value ? '#38bdf8' : 'white' }}>
                          {d.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>{d.sub}</div>
                      </div>
                      {anamneseData.duration === d.value && <CheckCircle2 size={18} color="#38bdf8" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Intensidade (slider visual) */}
              {queueStep === 3 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                      {['😌', '🙂', '😟', '😣', '😫'][anamneseData.severity - 1]}
                    </div>
                    <div style={{
                      fontSize: '1.25rem', fontWeight: 900,
                      color: SEVERITY_COLORS[anamneseData.severity - 1]
                    }}>
                      {SEVERITY_LABELS[anamneseData.severity - 1]}
                    </div>
                  </div>

                  <input
                    type="range" min={1} max={5} step={1}
                    value={anamneseData.severity}
                    onChange={e => setAnamneseData(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: SEVERITY_COLORS[anamneseData.severity - 1], cursor: 'pointer' }}
                  />

                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 700
                  }}>
                    <span>Muito Leve</span>
                    <span>Muito Intenso</span>
                  </div>

                  {/* Resumo da anamnese */}
                  <div style={{
                    marginTop: '1.25rem', padding: '0.85rem 1rem',
                    background: 'rgba(56,189,248,0.06)', borderRadius: '0.75rem',
                    border: '1px solid rgba(56,189,248,0.15)'
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#38bdf8', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                      RESUMO DA ANAMNESE
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {buildComplaintText()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de navegação */}
            <div style={{
              padding: '1rem 1.5rem 1.5rem',
              display: 'flex', gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  if (queueStep === 1) setShowComplaintModal(false);
                  else setQueueStep(s => (s - 1) as QueueStep);
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', padding: '0.85rem 1rem',
                  borderRadius: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem'
                }}
              >
                <ChevronLeft size={16} />
                {queueStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {queueStep < 3 ? (
                <button
                  onClick={() => setQueueStep(s => (s + 1) as QueueStep)}
                  disabled={queueStep === 1 ? !canProceedStep1 : !canProceedStep2}
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    color: 'white', border: 'none',
                    padding: '0.85rem', borderRadius: '0.85rem',
                    fontWeight: 800, cursor: (queueStep === 1 ? !canProceedStep1 : !canProceedStep2) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    fontSize: '0.9rem', opacity: (queueStep === 1 ? !canProceedStep1 : !canProceedStep2) ? 0.5 : 1,
                    boxShadow: '0 6px 16px rgba(37,99,235,0.3)', transition: 'all 0.15s ease'
                  }}
                >
                  Próximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleEnqueueFinal}
                  disabled={enqueueLoading}
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white', border: 'none',
                    padding: '0.85rem', borderRadius: '0.85rem',
                    fontWeight: 800, cursor: enqueueLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    fontSize: '0.9rem', opacity: enqueueLoading ? 0.7 : 1,
                    boxShadow: '0 6px 16px rgba(16,185,129,0.35)', transition: 'all 0.15s ease'
                  }}
                >
                  {enqueueLoading
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Entrando...</>
                    : <><PlusCircle size={16} /> Entrar na Fila</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-primary-action {
          width: 100%; background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white; border: none; padding: 0.95rem 1.5rem;
          border-radius: 0.85rem; font-weight: 800; font-size: 0.95rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 0.6rem; transition: all 0.2s ease;
          box-shadow: 0 8px 20px -4px rgba(37,99,235,0.4);
        }
        .btn-primary-action:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb); transform: translateY(-1px); }
        .card-nav {
          background: rgba(30,41,59,0.6); backdrop-filter: blur(12px);
          border-radius: 1.25rem; padding: 1.25rem;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; transition: all 0.2s ease;
        }
        .card-nav:hover { background: rgba(30,41,59,0.9); border-color: rgba(56,189,248,0.3); transform: translateY(-2px); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.7; } }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
