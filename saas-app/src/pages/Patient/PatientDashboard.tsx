import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, FileText, Video } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const PatientDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [inQueue, setInQueue] = useState(true);
  const [consultationReady, setConsultationReady] = useState(false);
  const [roomData, setRoomData] = useState<{roomId: string, doctorId: string} | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/patient/login');
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);

    s.on('queue_updated', () => console.log('Queue changed'));
    s.emit('join_room', user.id);

    s.on('consultation_started', (data) => {
        setRoomData({ roomId: data.roomId, doctorId: data.doctorId });
        setConsultationReady(true);
        setInQueue(false);
    });

    s.on('consultation_ended', (data) => {
      alert("Sua consulta terminou. Seu prontuário foi atualizado e salvo.");
      navigate('/patient/login');
    });

    return () => s.disconnect();
  }, [user, navigate]);

  const enterRoom = () => {
      if(roomData) {
          setConsultationRoomId(roomData.roomId);
          navigate(`/patient/consultation/${roomData.roomId}?doc=${roomData.doctorId}`);
      }
  };

  if(!user) return null;

  return (
    <div className="dashboard-container">
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Olá, {user.name}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Acompanhe o status do seu atendimento</p>

      {inQueue && !consultationReady && (
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--primary-color)', animation: 'slideUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Clock size={32} color="var(--primary-color)" />
            <h3 style={{ margin: 0 }}>Você está na fila de espera</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Por favor, aguarde. Um médico logo irá chamar você para teleconsulta. Não feche esta aba.</p>
          <div style={{ marginTop: '1.5rem', width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))', borderRadius: '4px', animation: 'fadeIn 2s infinite alternate' }} />
          </div>
        </div>
      )}

      {consultationReady && (
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--secondary-color)', animation: 'slideUp 0.5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Activity size={32} color="var(--secondary-color)" />
            <h3 style={{ margin: 0 }}>Sua Consulta Pronta!</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>O médico já está aguardando você na sala de vídeo.</p>
          <button className="btn btn-secondary" onClick={enterRoom} style={{ padding: '1rem 2rem', fontSize: '1.1rem', width: '100%' }}>
            <Video size={20} style={{ marginRight: '0.5rem' }} /> Entrar na Sala com Médico
          </button>
        </div>
      )}

      <div className="card-grid">
        <div className="glass-card" style={{ padding: '1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <FileText color="var(--primary-color)" size={24} />
            <h4>Histórico de Consultas</h4>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nenhuma consulta anterior encontrada.</p>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Activity color="var(--danger-color)" size={24} />
            <h4>Encaminhamentos e Atestados</h4>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Você não possui documentos no momento.</p>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
