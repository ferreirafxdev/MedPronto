import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io } from 'socket.io-client';
import { openDocument } from '../../utils/s3';
// Mirotalk WebRTC Integration

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const docId = new URLSearchParams(location.search).get('doc');

  useEffect(() => {
    if(!user || !docId) { navigate('/patient/login'); return; }
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    s.emit('join_room', roomId);
    s.on('consultation_ended', (data) => { if(data?.pdf_url) openDocument(data.pdf_url); alert("Sua consulta terminou."); navigate('/patient/dashboard'); });
    return () => { s.disconnect(); };
  }, [roomId, user, docId, navigate]);

  const roomName = `MedProntoRoom_Doc_${docId?.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ padding: '0 2rem 2rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', background: 'var(--bg-white)', padding: '0.75rem 1.15rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', marginTop: '0.85rem', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Telemedicina — <span className="text-gradient">Pronto Socorro</span></h2>
        <span className="status-badge status-active">Aguarde o Médico</span>
      </div>
      <div className="video-container" style={{ height: 'calc(100vh - 180px)', position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe
            src={`https://p2p.mirotalk.com/join/${roomName}?name=${encodeURIComponent(user?.name || 'Paciente')}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; speaker-selection"
          />
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
