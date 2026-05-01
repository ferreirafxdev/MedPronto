import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { PhoneOff } from 'lucide-react';
import JitsiVideo from '../../components/JitsiVideo';
import { useStore } from '../../store/useStore';

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'active' | 'ended'>('active');

  useEffect(() => {
    // Polling to detect if consultation ended in database
    const interval = setInterval(async () => {
      try {
        const r = await apiClient.get(`/api/consultations/status/${roomId}`);
        if (r.data.status === 'finished') {
          setStatus('ended');
          clearInterval(interval);
          setTimeout(() => navigate('/patient/dashboard'), 3000);
        }
      } catch (e) { /* ignore */ }
    }, 10000);

    return () => clearInterval(interval);
  }, [roomId, navigate]);

  if (status === 'ended') {
    return (
      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
        <div>
          <div style={{ width: '80px', height: '80px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
             <PhoneOff size={40} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Consulta Finalizada</h2>
          <p style={{ color: '#94a3b8', marginTop: '1rem' }}>O médico encerrou o atendimento. Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <JitsiVideo roomName={roomId || 'default'} userName={user?.name || 'Paciente'} />
      
      {/* Small Overlay to show MedPronto Branding over Jitsi */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.5rem 1rem', borderRadius: '2rem', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
         <div style={{ width: '24px', height: '24px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: 'white' }}>MP</div>
         <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>Consulta Segura MedPronto</span>
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
