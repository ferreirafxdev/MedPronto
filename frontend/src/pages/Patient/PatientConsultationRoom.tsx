import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { Loader2, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';
import { OpenVidu, Session, Publisher, Subscriber } from 'openvidu-browser';
import VideoComponent from '../../components/VideoComponent';

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();

  // -- OpenVidu State --
  const [session, setSession] = useState<Session | null>(null);
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'active' | 'ended'>('connecting');

  const joinSession = useCallback(async () => {
    const ov = new OpenVidu();
    const mySession = ov.initSession();

    mySession.on('streamCreated', (event) => {
      const sub = mySession.subscribe(event.stream, undefined);
      setSubscriber(sub);
      setStatus('active');
    });

    mySession.on('streamDestroyed', () => {
      setSubscriber(null);
      setStatus('waiting');
    });

    try {
      const sessionResponse = await apiClient.post('/api/webrtc/sessions', { customSessionId: roomId });
      const sessionId = sessionResponse.data.sessionId;

      const tokenResponse = await apiClient.post(`/api/webrtc/sessions/${sessionId}/connections`, {
        role: 'PUBLISHER',
        data: JSON.stringify({ clientData: user?.name || 'Paciente' }),
      });
      const token = tokenResponse.data.token;

      await mySession.connect(token, { clientData: user?.name || 'Paciente' });

      const pub = await ov.initPublisherAsync(undefined, {
        audioSource: undefined,
        videoSource: undefined,
        publishAudio: true,
        publishVideo: true,
        resolution: '1280x720',
        frameRate: 30,
        insertMode: 'APPEND',
        mirror: true,
      });

      mySession.publish(pub);
      setSession(mySession);
      setPublisher(pub);
      setStatus('waiting');
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Erro ao conectar ao vídeo.');
    }
  }, [roomId, user]);

  useEffect(() => {
    joinSession();
    
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

    return () => {
      if (session) session.disconnect();
      clearInterval(interval);
    };
  }, [joinSession, roomId, navigate]);

  const toggleAudio = () => {
    if (publisher) {
      publisher.publishAudio(!audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (publisher) {
      publisher.publishVideo(!videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

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
      {/* Main Stream (Doctor) */}
      <div style={{ width: '100%', height: '100%' }}>
        {subscriber ? (
          <VideoComponent streamManager={subscriber} isMain={true} />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0f172a' }}>
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
               <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 2s linear infinite' }} />
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', background: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VideoIcon size={32} color="#6366f1" />
               </div>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Aguardando o Médico</h3>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>O atendimento começará em instantes...</p>
          </div>
        )}
      </div>

      {/* Local PiP (Patient) */}
      {publisher && (
        <div style={{ 
          position: 'absolute', 
          bottom: '120px', 
          right: '20px', 
          width: '140px', 
          height: '210px', 
          zIndex: 5, 
          borderRadius: '1.25rem', 
          overflow: 'hidden', 
          border: '2px solid rgba(255,255,255,0.1)', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' 
        }}>
          <VideoComponent streamManager={publisher} />
        </div>
      )}

      {/* Header Overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)', zIndex: 10 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>MP</div>
            <div>
               <h4 style={{ color: 'white', margin: 0, fontWeight: 700 }}>Consulta Digital MedPronto</h4>
               <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0 }}>Ambiente Seguro e Criptografado</p>
            </div>
         </div>
      </div>

      {/* Controls Bar */}
      <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1.5rem', zIndex: 20 }}>
         <ControlBtn icon={audioEnabled ? <Mic /> : <MicOff />} active={audioEnabled} onClick={toggleAudio} />
         <ControlBtn icon={videoEnabled ? <VideoIcon /> : <VideoOff />} active={videoEnabled} onClick={toggleVideo} />
         <ControlBtn icon={<PhoneOff />} danger onClick={() => navigate('/patient/dashboard')} />
         <ControlBtn icon={<MessageSquare />} secondary />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const ControlBtn = ({ icon, onClick, active, danger, secondary }: any) => (
  <button 
    onClick={onClick} 
    style={{ 
      width: '60px', height: '60px', borderRadius: '50%', border: 'none', 
      background: danger ? '#ef4444' : secondary ? 'rgba(255,255,255,0.1)' : active ? 'white' : 'rgba(255,255,255,0.2)', 
      color: danger ? 'white' : active ? '#0f172a' : 'white', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      cursor: 'pointer', transition: 'all 0.2s', 
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
    }}
  >
    {icon}
  </button>
);

export default PatientConsultationRoom;
