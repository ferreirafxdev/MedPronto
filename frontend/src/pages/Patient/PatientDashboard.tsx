import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Loader2, Activity, Clock, Video, FileText, 
  PlusCircle, ShieldCheck, HeartPulse, UserCheck, 
  MessageSquare, AlertCircle, Sparkles, LogOut 
} from 'lucide-react';
import apiClient from '../../api/client';

const PatientDashboard = () => {
  const { user, setUser, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [inQueue, setInQueue] = useState(false);
  const [consultationReady, setConsultationReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enqueueLoading, setEnqueueLoading] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [doctorName, setDoctorName] = useState('');

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
  }, [user, searchParams, navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/patient/login');
      return;
    }
    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, [user, navigate, checkStatus]);

  const handleAutoEnqueue = async (customComplaint: string) => {
    if (!user) return;
    setEnqueueLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', {
        id: user.id,
        name: user.name,
        complaint: customComplaint
      });
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

  const handleEnqueueWithComplaint = async () => {
    if (!complaint.trim() || !user) return;
    setEnqueueLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', {
        id: user.id,
        name: user.name,
        complaint
      });
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
        alert(e.response?.data?.error || 'Erro ao entrar na fila. Tente novamente.');
      }
    } finally {
      setEnqueueLoading(false);
    }
  };

  const enterRoom = () => {
    setConsultationRoomId(user?.id || '');
    navigate(`/patient/consultation/${user?.id}`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    navigate('/');
  };

  if (!user || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Loader2 size={36} className="animate-spin" color="#3b82f6" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
      color: 'white',
      fontFamily: '"Inter", sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Mobile / Desktop */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',

        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #2563eb, #38bdf8)', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            <HeartPulse size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>MedPronto</h1>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>PAINEL DO PACIENTE</span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', padding: '0.5rem 0.85rem', borderRadius: '0.65rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main style={{ flex: 1, maxWidth: '640px', width: '100%', margin: '0 auto', padding: '1.5rem', boxSizing: 'border-box' }}>
        
        {/* Boas-Vindas */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            PRONTO SOCORRO VIRTUAL
          </div>
          <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 900 }}>
            Olá, <span style={{ background: 'linear-gradient(135deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user.name}</span>
          </h2>
        </div>

        {/* Notificação de Novo Pagamento Necessário */}
        {requiresPayment && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: 0, color: '#fecdd3', fontSize: '1rem', fontWeight: 800 }}>Novo Atendimento Requer Pagamento</h4>
              <p style={{ margin: '0.4rem 0 0 0', color: '#fda4af', fontSize: '0.85rem', lineHeight: 1.4 }}>
                Seu atendimento anterior foi finalizado pelo médico. Para solicitar uma nova teleconsulta e entrar na fila novamente, faça um novo pagamento.
              </p>
              <button 
                onClick={() => navigate('/patient/payment')}
                style={{
                  marginTop: '0.85rem', background: '#ef4444', color: 'white', border: 'none',
                  padding: '0.65rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                }}
              >
                Pagar Nova Consulta (R$ 50,00)
              </button>
            </div>
          </div>
        )}

        {/* Estado 1: Não está na fila e médica não chamou */}
        {!inQueue && !consultationReady && !requiresPayment && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1.5rem',
            padding: '1.75rem',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Deseja iniciar um atendimento?</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Médicos online disponíveis agora</span>
              </div>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Inicie seu atendimento médico com telemedicina sem filas de espera presenciais. Receba atestados, receitas e orientação médica imediata.
            </p>

            <button 
              onClick={() => setShowComplaintModal(true)} 
              className="btn-primary-action"
            >
              <PlusCircle size={20} /> Entrar na Fila de Atendimento
            </button>
          </div>
        )}

        {/* Estado 2: Paciente Aguardando na Fila */}
        {inQueue && !consultationReady && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
            borderRadius: '1.5rem',
            padding: '2rem 1.5rem',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#38bdf8', animation: 'pulse 2s infinite' }}>
              <Clock size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 900, color: 'white' }}>Você está na Fila de Espera</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.4 }}>
              Mantenha esta tela aberta. Assim que o médico te chamar, o botão de entrada aparecerá na tela.
            </p>

            <div style={{ marginTop: '1.5rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>
              <Activity size={16} /> Status: Fila Ativa em Tempo Real
            </div>
          </div>
        )}

        {/* Estado 3: Médico Pronto para Atender! */}
        {consultationReady && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))',
            borderRadius: '1.5rem',
            padding: '2rem 1.5rem',
            border: '2px solid #10b981',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 30px rgba(16, 185, 129, 0.25)',
            animation: 'fadeIn 0.4s ease'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'white', boxShadow: '0 0 20px #10b981' }}>
              <UserCheck size={36} />
            </div>

            <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 900, color: 'white' }}>O Médico Chamou Você!</h3>
            <p style={{ color: '#a7f3d0', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Dr(a). {doctorName} está te aguardando na sala de vídeochamada.
            </p>

            <button 
              onClick={enterRoom} 
              className="btn-success-action"
            >
              <Video size={22} /> ENTRAR NA SALA DE CONSULTA
            </button>
          </div>
        )}

        {/* Atalhos Rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div 
            onClick={() => navigate('/patient/profile')} 
            className="card-nav"
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '0.85rem' }}>
              <FileText size={22} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Meu Histórico</h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>Receitas e atestados</span>
          </div>

          <div 
            onClick={() => navigate('/patient/payment')} 
            className="card-nav"
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '0.85rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Solicitar Consulta</h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>Nova teleconsulta 24h</span>
          </div>
        </div>

      </main>

      {/* Modal de Queixa Principal */}
      {showComplaintModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            maxWidth: '440px', width: '100%', background: '#1e293b',
            borderRadius: '1.5rem', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'scaleUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <MessageSquare size={24} color="#38bdf8" />
              <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>O que você está sentindo?</h3>
            </div>
            
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
              Descreva seus principais sintomas (ex: dor de cabeça, febre, dor de garganta) para orientar o médico.
            </p>

            <textarea
              className="modal-textarea"
              rows={4}
              placeholder="Ex: Estou com febre de 38°C e dor no corpo desde ontem..."
              value={complaint}
              onChange={e => setComplaint(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button 
                onClick={() => setShowComplaintModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', borderRadius: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: '0.85rem'
                }}
              >
                Cancelar
              </button>

              <button 
                onClick={handleEnqueueWithComplaint} 
                disabled={!complaint.trim() || enqueueLoading}
                className="btn-primary-action"
                style={{ marginTop: 0 }}
              >
                {enqueueLoading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar na Fila'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-primary-action {
          width: 100%;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white;
          border: none;
          padding: 0.95rem 1.5rem;
          border-radius: 0.85rem;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.2s ease;
          box-shadow: 0 8px 20px -4px rgba(37,99,235,0.4);
          marginTop: 0.5rem;
        }
        .btn-primary-action:hover {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          transform: translateY(-1px);
        }
        .btn-primary-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-success-action {
          width: 100%;
          background: linear-gradient(135deg, #059669, #10b981);
          color: white;
          border: none;
          padding: 1.1rem 1.5rem;
          border-radius: 0.85rem;
          font-weight: 900;
          font-size: 1.05rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.2s ease;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
          marginTop: 1.5rem;
        }
        .btn-success-action:hover {
          background: linear-gradient(135deg, #047857, #059669);
          transform: translateY(-2px);
        }

        .card-nav {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(12px);
          border-radius: 1.25rem;
          padding: 1.25rem;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .card-nav:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(56, 189, 248, 0.3);
          transform: translateY(-2px);
        }

        .modal-textarea {
          width: 100%;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 0.85rem;
          padding: 1rem;
          color: white;
          font-size: 0.95rem;
          outline: none;
          resize: none;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .modal-textarea:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
