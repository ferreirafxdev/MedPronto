import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { CheckCircle, Edit3, ClipboardList, PenTool, FileText, ShieldCheck, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react';
import { OpenVidu, Session, Publisher, Subscriber } from 'openvidu-browser';
import VideoComponent from '../../components/VideoComponent';

const ConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  
  // -- OpenVidu State --
  const [OV, setOV] = useState<OpenVidu | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // -- Medical Record State --
  const [activeTab, setActiveTab] = useState<'evolucao' | 'exames' | 'receituario' | 'atestado'>('evolucao');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingStatus, setSigningStatus] = useState<'idle' | 'notified' | 'signed' | 'error'>('idle');
  const [consultationTime, setConsultationTime] = useState(0);
  const [atestadoContent, setAtestadoContent] = useState('');
  const [atestadoModel, setAtestadoModel] = useState('padrão');
  const [prescriptionContent, setPrescriptionContent] = useState('');

  // -- Timer --
  useEffect(() => { 
    const t = setInterval(() => setConsultationTime(p => p + 1), 1000); 
    return () => clearInterval(t); 
  }, []);
  
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // -- OpenVidu Logic --
  const joinSession = useCallback(async () => {
    const ov = new OpenVidu();
    const mySession = ov.initSession();

    mySession.on('streamCreated', (event) => {
      const sub = mySession.subscribe(event.stream, undefined);
      setSubscriber(sub);
    });

    mySession.on('streamDestroyed', () => setSubscriber(null));

    try {
      // 1. Create Session in Backend
      const sessionResponse = await apiClient.post('/api/webrtc/sessions', { customSessionId: roomId });
      const sessionId = sessionResponse.data.sessionId;

      // 2. Get Token from Backend
      const tokenResponse = await apiClient.post(`/api/webrtc/sessions/${sessionId}/connections`, {
        role: 'PUBLISHER',
        data: JSON.stringify({ clientData: user?.name || 'Médico' }),
      });
      const token = tokenResponse.data.token;

      // 3. Connect to Session
      await mySession.connect(token, { clientData: user?.name || 'Médico' });

      // 4. Publish Local Stream
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
      setOV(ov);
      setSession(mySession);
      setPublisher(pub);
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Erro ao conectar ao vídeo.');
    }
  }, [roomId, user]);

  useEffect(() => {
    if (!user || user.role !== 'doctor') { navigate('/doctor/login'); return; }
    joinSession();
    return () => {
      if (session) session.disconnect();
    };
  }, [user, navigate, joinSession]);

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

  // -- Business Logic --
  const downloadPDF = async (endpoint: string, data: any, filename: string) => {
    setLoading(true);
    try {
      const resp = await apiClient.post(`/api/${endpoint}`, { patientId: roomId, doctorId: user?.id, ...data }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { alert(`Erro ao gerar ${endpoint}.`); } finally { setLoading(false); }
  };

  const endConsultation = async () => {
    if(window.confirm("Deseja encerrar o atendimento?")) {
      setLoading(true);
      try {
        await apiClient.post('/api/end-consultation', { 
          patientId: roomId, doctorId: user?.id, notes, prescriptions: prescriptions || prescriptionContent, exams, content: prescriptionContent
        });
        if (session) session.disconnect();
        navigate('/doctor/dashboard');
      } catch(err) { alert("Erro ao encerrar."); } finally { setLoading(false); }
    }
  };

  const SectionHeader = ({ icon: Icon, title, desc }: any) => (
    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.45rem', borderRadius: '0.75rem', display: 'flex' }}>
        <Icon size={18} />
      </div>
      <div>
        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: 700 }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{desc}</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800 }}>AO VIVO</div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>Sala de Atendimento</h2>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontFamily: 'monospace', fontWeight: 800 }}>
             {formatTime(consultationTime)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/doctor/dashboard')}>Voltar</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', position: 'relative' }}>
        {/* Video Area */}
        <div style={{ position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {subscriber ? (
            <VideoComponent streamManager={subscriber} isMain={true} />
          ) : (
            <div style={{ textAlign: 'center', color: '#475569' }}>
               <Loader2 className="animate-spin" size={48} style={{ marginBottom: '1rem', margin: '0 auto' }} />
               <p>Aguardando o paciente entrar...</p>
            </div>
          )}

          {/* Local PiP */}
          {publisher && (
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '180px', height: '120px', zIndex: 5, borderRadius: '1rem', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
               <VideoComponent streamManager={publisher} />
            </div>
          )}

          {/* Floating Controls */}
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.75rem 1.5rem', borderRadius: '4rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
             <ControlBtn icon={audioEnabled ? <Mic size={20}/> : <MicOff size={20}/>} active={audioEnabled} onClick={toggleAudio} />
             <ControlBtn icon={videoEnabled ? <VideoIcon size={20}/> : <VideoOff size={20}/>} active={videoEnabled} onClick={toggleVideo} />
             <ControlBtn icon={<PhoneOff size={20}/>} danger onClick={endConsultation} />
          </div>
        </div>

        {/* Sidebar (Notes) */}
        <div style={{ background: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
           <div style={{ display: 'flex', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: '0.25rem' }}>
              <TabBtn active={activeTab === 'evolucao'} onClick={()=>setActiveTab('evolucao')} icon={Edit3} label="Evolução" />
              <TabBtn active={activeTab === 'receituario'} onClick={()=>setActiveTab('receituario')} icon={PenTool} label="Receita" />
              <TabBtn active={activeTab === 'atestado'} onClick={()=>setActiveTab('atestado')} icon={FileText} label="Atestado" />
           </div>

           <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
              {activeTab === 'evolucao' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={Edit3} title="Evolução do Caso" desc="Anote aqui o quadro clínico." />
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem' }} value={notes} onChange={e=>setNotes(e.target.value)} />
                </div>
              )}
              {activeTab === 'receituario' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={PenTool} title="Prescrição" desc="Será salva no prontuário." />
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem', fontFamily: 'monospace' }} value={prescriptionContent} onChange={e=>setPrescriptionContent(e.target.value)} />
                </div>
              )}
              {activeTab === 'atestado' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={FileText} title="Atestado Médico" desc="Emissão de afastamento." />
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', marginBottom: '1rem', border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                     <div><label style={{ fontSize: '0.65rem', fontWeight: 800 }}>DIAS</label><input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} /></div>
                     <div><label style={{ fontSize: '0.65rem', fontWeight: 800 }}>CID</label><input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} /></div>
                  </div>
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem' }} value={atestadoContent} onChange={e=>setAtestadoContent(e.target.value)} />
                </div>
              )}
           </div>

           <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={endConsultation} style={{ borderRadius: '3rem', height: '56px', fontWeight: 800 }}>
                 FINALIZAR CONSULTA
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const ControlBtn = ({ icon, onClick, active, danger }: any) => (
  <button onClick={onClick} style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: danger ? '#ef4444' : active ? '#6366f1' : '#475569', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
    {icon}
  </button>
);

const TabBtn = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: active ? 'white' : 'transparent', color: active ? '#6366f1' : '#64748b', fontSize: '0.75rem', fontWeight: active ? 700 : 500, transition: 'all 0.2s', boxShadow: active ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}>
    <Icon size={14} /> {label}
  </button>
);

export default ConsultationRoom;
