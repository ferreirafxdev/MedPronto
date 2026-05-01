import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Loader2, Activity, Clock, Wifi, Video, FileText, MessageSquare } from 'lucide-react';
import apiClient from '../../api/client';

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
        id: user.id,
        name: user.name,
        complaint: customComplaint || complaint
      });
      if (resp.data.success) {
        setInQueue(true);
        localStorage.removeItem('payment_confirmed');
        setShowComplaintModal(false);
      }
    } catch (e) { console.error("Erro ao entrar na fila"); } finally { setLoading(false); }
  }, [user, complaint]);

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }

    const checkStatus = async () => {
      try {
        const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
        const isNewConsultation = searchParams.get('new_consultation') === 'true' || localStorage.getItem('payment_confirmed') === 'true';

        if (resp.data.isActive) {
            // Need to fetch doctorId or roomId if active. 
            // For now let's just use polling or let them refresh.
            setInQueue(false);
            setConsultationReady(true);
            setLoading(false);
        } else if (resp.data.inQueue) {
          setInQueue(true);
          setLoading(false);
        } else if (isNewConsultation) {
           setShowComplaintModal(true);
           setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (e) { setLoading(false); }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Polling for status change
    return () => clearInterval(interval);
  }, [user, navigate, searchParams]);

  const enterRoom = () => {
      // In this simplified version, roomId is the user.id
      setConsultationRoomId(user?.id || '');
      navigate(`/patient/consultation/${user?.id}`);
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Painel de Saúde</p>
        </div>
      </div>

      {!inQueue && !consultationReady && (
        <div className="premium-card animate-fade-in">
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Deseja iniciar um novo atendimento?</h3>
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1rem' }} onClick={() => navigate('/patient/payment')}>
            Solicitar Nova Consulta (R$ 50,00)
          </button>
        </div>
      )}

      {inQueue && !consultationReady && (
        <div className="premium-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Clock size={22} color="var(--accent)" />
            <h3 style={{ margin: 0 }}>Você está na fila de espera</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Aguarde o chamado do médico.</p>
        </div>
      )}

      {consultationReady && (
        <div style={{ background: 'var(--bg-white)', padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--mint-light)', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ margin: 0 }}>O Médico está pronto!</h3>
          <button className="btn btn-secondary btn-full btn-lg" style={{ marginTop: '1rem' }} onClick={enterRoom}><Video size={18} /> Entrar na Sala</button>
        </div>
      )}

      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        <div onClick={() => navigate('/patient/profile')} className="premium-card" style={{ cursor: 'pointer' }}>
          <FileText color="var(--accent)" size={20} />
          <h4>Meu Histórico</h4>
          <p>Receitas e atestados.</p>
        </div>
      </div>

      {showComplaintModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="premium-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3>O que você está sentindo?</h3>
            <textarea className="form-control" rows={4} value={complaint} onChange={e => setComplaint(e.target.value)} style={{ marginTop: '1rem' }} />
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1rem' }} onClick={() => handleEnqueue()} disabled={!complaint.trim() || loading}>Entrar na Fila</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
