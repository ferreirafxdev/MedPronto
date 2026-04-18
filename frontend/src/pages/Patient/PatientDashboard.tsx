import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, Activity, Clock, Wifi, Video, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';

const PatientDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [inQueue, setInQueue] = useState(false);
  const [consultationReady, setConsultationReady] = useState(false);
  const [roomData, setRoomData] = useState<{ roomId: string, doctorId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState('');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }

    // Check initial status
    const checkStatus = async () => {
      try {
        const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
        if (resp.data.inQueue) setInQueue(true);
      } catch (e) {
        console.error("Erro ao verificar status da fila");
      } finally {
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
      if (data?.pdf_url) window.open(data.pdf_url, '_blank');
      alert("Sua consulta terminou. Seu prontuário foi salvo.");
      setInQueue(false);
      setConsultationReady(false);
    });

    return () => { s.disconnect(); };
  }, [user, navigate]);

  const handleShowPayment = async () => {
    if (!complaint.trim()) return alert("Por favor, descreva o que está sentindo.");
    setLoading(true);
    try {
      const resp = await apiClient.post('/api/payment/pix-simulate', { patientId: user?.id });
      if (resp.data.success) {
        setPixKey(resp.data.pixKey);
        setShowPixModal(true);
      }
    } catch (e) {
      alert("Erro ao gerar PIX. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnqueue = async () => {
    setLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', {
        ...user,
        complaint
      });
      if (resp.data.success) {
        setInQueue(true);
        setShowPixModal(false);
      }
    } catch (e) {
      alert("Erro ao entrar na fila. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const enterRoom = () => {
    if (roomData) {
      setConsultationRoomId(roomData.roomId);
      navigate(`/patient/consultation/${roomData.roomId}?doc=${roomData.doctorId}`);
    }
  };

  if (!user || loading) return (
    <div className="auth-container">
      <Loader2 size={32} className="animate-spin" color="var(--accent)" />
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

      {/* NOT IN QUEUE AND NOT IN CONSULTATION */}
      {!inQueue && !consultationReady && (
        <div style={{ background: 'var(--bg-white)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Pronto para sua consulta?</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Entre na fila virtual para falar com um médico agora.</p>
            </div>
          </div>

          <div className="form-group">
            <label>O que você está sentindo?</label>
            <textarea
              className="form-control"
              placeholder="Descreva seus sintomas brevemente..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={3}
            />
          </div>
          <button className="btn btn-primary btn-full btn-lg" onClick={handleShowPayment} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Realizar Pagamento (R$ 50,00)'}
          </button>
        </div>
      )}

      {/* PIX MODAL (SIMULATED) */}
      {showPixModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-white)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-lg)', animation: 'fadeInUp 0.3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--accent-ultra-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Wifi size={32} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>Pagamento PIX</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Valor da Consulta: <strong>R$ 50,00</strong></p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixKey)}`} alt="PIX QR Code" style={{ marginBottom: '1rem', mixBlendMode: 'multiply' }} />
               <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>COPIE A CHAVE ABAIXO:</div>
               <code style={{ display: 'block', wordBreak: 'break-all', fontSize: '0.65rem', background: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{pixKey.substring(0, 60)}...</code>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleEnqueue} disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Paguei (Entrar na Fila)'}
              </button>
              <button className="btn btn-outline btn-full" onClick={() => setShowPixModal(false)}>Cancelar</button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>O acesso à fila é liberado automaticamente após a confirmação.</p>
          </div>
        </div>
      )}

      {/* IN QUEUE */}
      {inQueue && !consultationReady && (
        <div style={{ background: 'var(--bg-white)', padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--accent-light)', boxShadow: 'var(--shadow-md)', animation: 'fadeInUp 0.5s ease', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent), var(--mint), var(--accent))', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Você está na fila de espera</h3>
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
        <div onClick={() => navigate('/patient/profile')} style={{ background: 'var(--bg-white)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <FileText color="var(--accent)" size={18} />
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Meu Histórico</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Receitas, exames e resumos de consultas anteriores.</p>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>Ver tudo →</span>
        </div>
        <div onClick={() => navigate('/patient/profile')} style={{ background: 'var(--bg-white)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--violet-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <Activity color="var(--violet)" size={18} />
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Atestados Médicos</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Acesse e valide seus atestados emitidos na plataforma.</p>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--violet)' }}>Ver documentos →</span>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
