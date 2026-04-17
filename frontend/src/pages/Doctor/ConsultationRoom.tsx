import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
import { CheckCircle, Edit3, ClipboardList, PenTool, FileText, Download, Send, ShieldCheck } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';

const ConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'evolucao' | 'exames' | 'receituario' | 'atestado'>('evolucao');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingStatus, setSigningStatus] = useState<'idle' | 'notified' | 'signed' | 'error'>('idle');
  const [messages, setMessages] = useState<{sender: string, text: string, time: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [consultationTime, setConsultationTime] = useState(0);

  useEffect(() => { const t = setInterval(() => setConsultationTime(p => p + 1), 1000); return () => clearInterval(t); }, []);
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    if(!user || user.role !== 'doctor') { navigate('/doctor/login'); return; }
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);
    s.emit('join_room', roomId);
    s.emit('consultation_started', { roomId, doctorId: user.id, doctorName: user.name });
    s.on('receive_message', (data: any) => { setMessages(prev => [...prev, { sender: data.sender, text: data.text, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]); });
    return () => { s.disconnect(); };
  }, [roomId, user, navigate]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newMessage.trim() || !socket) return;
    socket.emit('send_message', { roomId, sender: user?.name || 'Médico', text: newMessage });
    setMessages(prev => [...prev, { sender: 'Você', text: newMessage, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
    setNewMessage('');
  };

  const downloadPDF = async (endpoint: string, data: any, filename: string) => {
    setLoading(true);
    try {
      const resp = await apiClient.post(`/api/${endpoint}`, { patientId: roomId, doctorId: user?.id, ...data }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); link.remove();
      alert(`✅ ${endpoint} gerado com sucesso!`);
    } catch (err) { alert(`Erro ao gerar ${endpoint}.`); } finally { setLoading(false); }
  };

  const startDigitalSignature = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const resp = await apiClient.post('/api/doctor/signature/start', { doctorId: user.id });
      const sessionId = resp.data.session_id;
      setSigningStatus('notified');
      
      // Poll for status
      const interval = setInterval(async () => {
        try {
          const statusResp = await apiClient.get(`/api/doctor/signature/status/${sessionId}`);
          if (statusResp.data.status === 'ready') {
            setSigningStatus('signed');
            clearInterval(interval);
            alert("✅ Receita assinada digitalmente com sucesso!");
          } else if (statusResp.data.status === 'denied') {
            setSigningStatus('error');
            clearInterval(interval);
            alert("❌ Assinatura negada no aplicativo.");
          }
        } catch (e) {
          clearInterval(interval);
        }
      }, 3000);
    } catch (err: any) {
      alert("Erro ao iniciar assinatura: " + (err.response?.data?.error || err.message));
      setSigningStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const endConsultation = async () => {
    if(window.confirm("Deseja encerrar e gerar o PDF?")) {
      setLoading(true);
      try {
        const r = await apiClient.post('/api/end-consultation', { patientId: roomId, doctorId: user?.id, notes, prescriptions, exams });
        if(r.data.pdf_url) window.open(r.data.pdf_url, '_blank');
        alert("✅ Atendimento finalizado!"); navigate('/doctor/dashboard');
      } catch(err) { alert("Erro ao encerrar."); } finally { setLoading(false); }
    }
  };

  const roomName = `MedProntoRoom_Doc_${user?.id?.replace(/[^a-zA-Z0-9]/g, '')}`;

  const SectionHeader = ({ title, desc }: { title: string; desc: string }) => (
    <div style={{ marginBottom: '0.65rem', padding: '0.6rem 0.85rem', background: 'var(--accent-ultra-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-light)' }}>
      <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '0.9rem' }}>{title}</h4>
      <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  );

  return (
    <div style={{ padding: '0 1.5rem 1.5rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.65rem 0', background: 'var(--bg-white)', padding: '0.6rem 1.15rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Prontuário de {user?.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>Atendimento: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>#{roomId?.substring(0,8).toUpperCase()}</span></p>
          </div>
          <div style={{ height: '22px', width: '1px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--coral)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--coral)', fontFeatureSettings: '"tnum"' }}>{formatTime(consultationTime)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span className="status-badge status-active">Conexão Segura</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/doctor/dashboard')}>Sair</button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '0.85rem', overflow: 'hidden' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%' }}>
          <div className="video-container" style={{ flexGrow: 1, position: 'relative', minHeight: '320px' }}>
            <JitsiMeeting domain="meet.jit.si" roomName={roomName}
              configOverwrite={{ startWithAudioMuted: false, startWithVideoMuted: false, prejoinPageEnabled: false, disableDeepLinking: true, toolbarButtons: ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'tileview'] }}
              interfaceConfigOverwrite={{ DISABLE_JOIN_LEAVE_NOTIFICATIONS: true, SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false }}
              userInfo={{ displayName: user?.name || 'Médico', email: user?.email || 'medico@medpronto.com' }}
              getIFrameRef={(ref) => { ref.style.height = '100%'; ref.style.width = '100%'; ref.style.border = 'none'; }}
            />
          </div>
          {/* Chat */}
          <div className="consultation-panel" style={{ height: '240px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-heading)' }}>Chat com Paciente</span>
              <span className="status-badge status-active" style={{ fontSize: '0.6rem', padding: '0.12rem 0.45rem' }}>Ao vivo</span>
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: '1.5rem' }}>Inicie uma conversa...</div>
              ) : messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'Você' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.1rem', textAlign: m.sender === 'Você' ? 'right' : 'left' }}>{m.sender} • {m.time}</div>
                  <div style={{ background: m.sender === 'Você' ? 'var(--accent)' : 'var(--bg-subtle)', color: m.sender === 'Você' ? 'white' : 'var(--text-body)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', borderTopRightRadius: m.sender === 'Você' ? '2px' : 'var(--radius-md)', borderTopLeftRadius: m.sender === 'Você' ? 'var(--radius-md)' : '2px', fontSize: '0.82rem', boxShadow: 'var(--shadow-xs)' }}>{m.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.35rem' }}>
              <input type="text" className="form-control" style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }} value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Mensagem..." />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: '34px', height: '34px', padding: 0, minWidth: '34px' }}><Send size={14} /></button>
            </form>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="consultation-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="tabs">
            <div className={`tab ${activeTab === 'evolucao' ? 'active' : ''}`} onClick={()=>setActiveTab('evolucao')}><Edit3 size={14} style={{ marginBottom: '-2px', marginRight: '3px' }} /> Evolução</div>
            <div className={`tab ${activeTab === 'receituario' ? 'active' : ''}`} onClick={()=>setActiveTab('receituario')}><PenTool size={14} style={{ marginBottom: '-2px', marginRight: '3px' }} /> Receita</div>
            <div className={`tab ${activeTab === 'exames' ? 'active' : ''}`} onClick={()=>setActiveTab('exames')}><ClipboardList size={14} style={{ marginBottom: '-2px', marginRight: '3px' }} /> Exames</div>
            <div className={`tab ${activeTab === 'atestado' ? 'active' : ''}`} onClick={()=>setActiveTab('atestado')}><FileText size={14} style={{ marginBottom: '-2px', marginRight: '3px' }} /> Atestado</div>
          </div>
          <div style={{ padding: '1.1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {activeTab === 'evolucao' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader title="Evolução Clínica" desc="Queixa, exame físico e conduta." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', minHeight: '80px' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paciente apresenta queixa de..." />
              </div>
            )}
            {activeTab === 'exames' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader title="Solicitação de Exames" desc="Exames laboratoriais ou de imagem." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', minHeight: '80px' }} value={exams} onChange={e=>setExams(e.target.value)} placeholder="Hemograma, Creatinina..." />
                <button className="btn btn-secondary" onClick={() => downloadPDF('exames', { exams }, `exames_${roomId?.substring(0,8)}.pdf`)} disabled={loading} style={{ marginTop: '0.65rem', width: '100%' }}>
                  {loading ? "Gerando..." : <><Download size={15} /> Baixar Pedido (PDF)</>}
                </button>
              </div>
            )}
            {activeTab === 'receituario' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader title="Receituário Digital" desc="Medicamentos e posologia." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', minHeight: '80px' }} value={prescriptions} onChange={e=>setPrescriptions(e.target.value)} placeholder="Dipirona 500mg, 6/6h..." />
                
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.65rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => downloadPDF('receita', { prescriptions }, `receita_${roomId?.substring(0,8)}.pdf`)} disabled={loading}>
                    {loading ? "Gerando..." : <><Download size={15} /> Baixar PDF</>}
                  </button>
                  
                  <button 
                    className={`btn ${signingStatus === 'signed' ? 'btn-secondary' : 'btn-primary'}`} 
                    style={{ flex: 1.5, position: 'relative' }} 
                    onClick={startDigitalSignature} 
                    disabled={loading || signingStatus === 'notified' || signingStatus === 'signed'}
                  >
                    {signingStatus === 'notified' ? (
                      <><div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> Aguardando App...</>
                    ) : signingStatus === 'signed' ? (
                      <><ShieldCheck size={16} /> Receita Assinada</>
                    ) : (
                      <><PenTool size={16} /> Assinar Receita (Bird ID)</>
                    )}
                  </button>
                </div>

                {signingStatus === 'notified' && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.4rem', textAlign: 'center', fontWeight: 600 }}>
                    📲 Verifique a notificação no seu celular agora.
                  </p>
                )}
              </div>
            )}
            {activeTab === 'atestado' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader title="Atestado Médico" desc="Afastamento e CID." />
                <div style={{ flexGrow: 1, background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="form-group">
                    <label>Dias de Afastamento</label>
                    <input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} min="1" max="30" />
                  </div>
                  <div className="form-group" style={{ marginTop: '0.65rem' }}>
                    <label>CID-10 (Opcional)</label>
                    <input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Ex: Z00.0" />
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => downloadPDF('atestado', { daysOff, cid }, `atestado_${roomId?.substring(0,8)}.pdf`)} disabled={loading} style={{ marginTop: '0.65rem', width: '100%' }}>
                  {loading ? "Processando..." : <><Download size={15} /> Baixar Atestado (PDF)</>}
                </button>
              </div>
            )}
          </div>
          <div className="actions-bottom">
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--mint)' }}>Auto-save: Ativado</span>
              <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)' }}>Auditoria: Ativo</span>
            </div>
            <button className="btn btn-danger" onClick={endConsultation} disabled={loading} style={{ borderRadius: 'var(--radius-full)', padding: '0.6rem 1.75rem' }}>
              {loading ? "Salvando..." : <><CheckCircle size={16} /> Encerrar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
