import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, Activity, Clock, Wifi, Video, FileText, AlertCircle, ExternalLink, BadgeAlert, MessageSquare } from 'lucide-react';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
import { openDocument } from '../../utils/s3';

const PatientDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inQueue, setInQueue] = useState(false);
  const [consultationReady, setConsultationReady] = useState(false);
  const [roomData, setRoomData] = useState<{ roomId: string, doctorId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  const handleEnqueue = useCallback(async (customComplaint?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', {
        ...user,
        complaint: customComplaint || complaint
      });
      if (resp.data.success) {
        setInQueue(true);
        localStorage.removeItem('payment_confirmed');
        setShowComplaintModal(false);
      }
    } catch (e) {
      console.error("Erro ao entrar na fila");
    } finally {
      setLoading(false);
    }
  }, [user, complaint]);

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }

    const checkStatus = async () => {
      try {
        const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
        
        const isNewConsultation = searchParams.get('new_consultation') === 'true' || localStorage.getItem('payment_confirmed') === 'true';

        if (resp.data.inQueue) {
          setInQueue(true);
          setLoading(false);
        } else if (isNewConsultation) {
           // For returning patients who just paid, ask for complaint first
           setShowComplaintModal(true);
           setLoading(false);
        } else if (searchParams.get('just_registered') === 'true') {
          // AUTO-ENQUEUE for new registrations (who already filled complaint in register form)
          await handleEnqueue();
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro ao verificar status da fila");
        setLoading(false);
      }
    };
    checkStatus();

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const s = io(socketUrl);
    s.emit('join_room', user.id);

    s.on('consultation_started', (data) => {
      setRoomData({ roomId: data.roomId, doctorId: data.doctorId });
      setConsultationReady(true);
      setInQueue(false);
    });


    s.on('consultation_ended', (data) => {
      if (data?.pdf_url) openDocument(data.pdf_url);
      alert("Sua consulta terminou. Seu prontuário foi salvo.");
      setInQueue(false);
      setConsultationReady(false);
    });

    return () => { s.disconnect(); };
  }, [user, navigate, searchParams, handleEnqueue]);

  const enterRoom = () => {
    if (roomData) {
      setConsultationRoomId(roomData.roomId);
      navigate(`/patient/consultation/${roomData.roomId}?doc=${roomData.doctorId}`);
    }
  };

  if (!user || loading) return (
    <div className="auth-container">
      <Loader2 size={32} className="animate-spin" color="var(--accent)" />
      <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>Configurando seu atendimento...</span>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>Olá, <span className="text-gradient">{user.name}</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bem-vindo ao seu painel de saúde</p>
        </div>
      </div>

      {/* NOT IN QUEUE AND NOT IN CONSULTATION (Show Call to Action for Existing Users) */}
      {!inQueue && !consultationReady && (
        <div className="premium-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--navy-dark)' }}>Deseja iniciar um novo atendimento?</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Você será redirecionado para o pagamento antes de entrar na fila.</p>
            </div>
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/patient/payment')}>
            Solicitar Nova Consulta (R$ 50,00)
          </button>
        </div>
      )}

      {/* IN QUEUE */}
      {inQueue && !consultationReady && (
        <div className="premium-card animate-fade-in" style={{ border: '1px solid var(--accent-light)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent), var(--mint), var(--accent))', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--navy-dark)' }}>Você está na fila de espera</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                <Wifi size={11} color="var(--mint)" />
                <span style={{ fontSize: '0.72rem', color: 'var(--mint)', fontWeight: 600 }}>Conectado • Aguarde o chamado do médico</span>
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Um médico irá iniciar sua teleconsulta em breve. Por favor, permaneça nesta página.</p>
        </div>
      )}

      {/* CONSULTATION READY */}
      {consultationReady && (
        <div style={{ background: 'var(--bg-white)', padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--mint-light)', boxShadow: 'var(--shadow-md)', animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--mint-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="var(--mint)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>O Médico está te chamando!</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Sua sala de consulta já está disponível. Clique no botão abaixo para entrar.</p>
          <button className="btn btn-secondary btn-full btn-lg" onClick={enterRoom}><Video size={18} /> Entrar na Sala de Vídeo</button>
        </div>
      )}

      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        <div onClick={() => navigate('/patient/profile')} className="premium-card" style={{ padding: '1.5rem', cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <FileText color="var(--accent)" size={20} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Meu Histórico</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Receitas, exames e resumos de consultas anteriores.</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>Ver tudo →</span>
        </div>
        <div onClick={() => navigate('/patient/profile')} className="premium-card" style={{ padding: '1.5rem', cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <Activity color="var(--violet)" size={20} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Atestados Médicos</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Acesse e valide seus atestados emitidos na plataforma.</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--violet)' }}>Ver documentos →</span>
        </div>
      </div>

      {/* COMPLAINT MODAL FOR RETURNING PATIENTS */}
      {showComplaintModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="premium-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', boxShadow: '0 0 100px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
               <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', margin: '0 auto 1rem' }}>
                  <MessageSquare size={28} color="var(--accent)" />
               </div>
               <h3 style={{ fontSize: '1.4rem' }}>O que você está sentindo?</h3>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dê um resumo rápido para o médico antes de iniciar.</p>
            </div>
            
            <div className="form-group">
                <textarea 
                    className="form-control" 
                    placeholder="Ex: Estou com febre e dor de cabeça há 2 dias..." 
                    rows={4} 
                    value={complaint} 
                    onChange={e => setComplaint(e.target.value)}
                    style={{ resize: 'none' }}
                />
            </div>
            
            <button 
                className="btn btn-primary btn-full btn-lg" 
                onClick={() => handleEnqueue()}
                disabled={!complaint.trim() || loading}
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Fila Agora'}
            </button>
            
            <button 
                className="btn btn-outline btn-full" 
                style={{ marginTop: '0.75rem', border: 'none', color: 'var(--text-faint)' }}
                onClick={() => setShowComplaintModal(false)}
            >
                Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
