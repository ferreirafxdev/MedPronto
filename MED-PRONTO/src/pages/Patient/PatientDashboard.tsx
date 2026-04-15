import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, FileText, Video, Wifi } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const PatientDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [inQueue, setInQueue] = useState(true);
  const [consultationReady, setConsultationReady] = useState(false);
  const [roomData, setRoomData] = useState<{roomId: string, doctorId: string} | null>(null);

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);
    s.on('queue_updated', () => console.log('Queue changed'));
    s.emit('join_room', user.id);
    s.on('consultation_started', (data) => { setRoomData({ roomId: data.roomId, doctorId: data.doctorId }); setConsultationReady(true); setInQueue(false); });
    s.on('consultation_ended', () => { alert("Sua consulta terminou. Seu prontuário foi atualizado e salvo."); navigate('/patient/login'); });
    return () => s.disconnect();
  }, [user, navigate]);

  const enterRoom = () => { if(roomData) { setConsultationRoomId(roomData.roomId); navigate(`/patient/consultation/${roomData.roomId}?doc=${roomData.doctorId}`); } };

  if(!user) return null;

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>Olá, <span className="text-gradient">{user.name}</span></h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Acompanhe o status do seu atendimento</p>
      </div>

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
                <span style={{ fontSize: '0.72rem', color: 'var(--mint)', fontWeight: 600 }}>Conectado ao sistema</span>
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Por favor, aguarde. Um médico logo irá chamar você para teleconsulta. Não feche esta aba.</p>
        </div>
      )}

      {consultationReady && (
        <div style={{ background: 'var(--bg-white)', padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--mint-light)', boxShadow: 'var(--shadow-md)', animation: 'fadeInUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--mint-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="var(--mint)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Sua Consulta Pronta!</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>O médico já está aguardando você na sala de vídeo.</p>
          <button className="btn btn-secondary btn-full btn-lg" onClick={enterRoom}><Video size={18} /> Entrar na Sala com Médico</button>
        </div>
      )}

      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        <div onClick={() => navigate('/patient/profile')} style={{ background: 'var(--bg-white)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <FileText color="var(--accent)" size={18} />
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Histórico de Consultas</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Veja todas as consultas, receitas e exames emitidos.</p>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>Acessar perfil →</span>
        </div>
        <div onClick={() => navigate('/patient/profile')} style={{ background: 'var(--bg-white)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--violet-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'center' }}>
            <Activity color="var(--violet)" size={18} />
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Atestados e Documentos</h4>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Consulte e baixe seus atestados com código de validação.</p>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--violet)' }}>Ver atestados →</span>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
