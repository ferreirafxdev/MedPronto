import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const docId = new URLSearchParams(location.search).get('doc');

  useEffect(() => {
    if(!user || !docId) { navigate('/patient/login'); return; }

    const checkStatus = async () => {
      try {
        const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
        // If no longer active/inQueue, it means consultation ended
        if (!resp.data.isActive && !resp.data.inQueue) {
          alert("Sua consulta terminou. Você será redirecionado para o seu histórico.");
          navigate('/patient/profile');
        }
      } catch (e) { console.error("Erro ao checar status"); }
    };

    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [user, docId, navigate]);

  const roomName = `MedProntoRoom_Doc_${docId?.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="room-full-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>AO VIVO</div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>Telemedicina — <span className="text-gradient">Pronto Socorro Online</span></h2>
        </div>
        <div style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
          {user?.name}
        </div>
      </div>

      <div style={{ flexGrow: 1, position: 'relative', background: '#000' }}>
          <iframe
            src={`https://p2p.mirotalk.com/join/${roomName}?name=${encodeURIComponent(user?.name || 'Paciente')}&audio=1&video=1&chat=0&settings=0&notify=0`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; speaker-selection"
          />
          <div style={{ position: 'absolute', bottom: '30px', left: '30px', background: 'rgba(15, 23, 42, 0.85)', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(8px)', maxWidth: '350px' }}>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Consulta em Andamento</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
              Mantenha esta janela aberta; você poderá ver suas receitas e atestados no seu perfil assim que o médico encerrar.
            </p>
          </div>
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
