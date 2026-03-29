import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io, Socket } from 'socket.io-client';
import { JitsiMeeting } from '@jitsi/react-sdk';

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const docId = searchParams.get('doc');

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if(!user || !docId) {
      navigate('/patient/login');
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);
    s.emit('join_room', roomId);

    s.on('consultation_ended', (data) => {
        if(data && data.pdf_url) {
            window.open(data.pdf_url, '_blank');
        }
        alert("Sua consulta terminou. Seu atestado PDF foi baixado em nova janela.");
        navigate('/patient/dashboard');
    });

    return () => {
        s.disconnect();
    };
  }, [roomId, user, docId, navigate]);

  const roomName = `MedProntoRoom_Doc_${docId?.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ padding: '0 2rem 2rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--glass-bg)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Telemedicina - Pronto Socorro</h2>
        <span className="status-badge status-active">Aguarde o Médico na Sala</span>
      </div>

      <div className="video-container" style={{ height: 'calc(100vh - 180px)', position: 'relative' }}>
          <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              configOverwrite={{
                  startWithAudioMuted: false,
                  startWithVideoMuted: false,
                  prejoinPageEnabled: false,
                  disableDeepLinking: true,
              }}
              interfaceConfigOverwrite={{
                  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                  SHOW_JITSI_WATERMARK: false,
                  SHOW_WATERMARK_FOR_GUESTS: false,
                  TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup', 'fullscreen']
              }}
              userInfo={{
                  displayName: user?.name || 'Paciente'
              }}
              getIFrameRef={(iframeRef: any) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; iframeRef.style.border = 'none'; }}
          />
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
