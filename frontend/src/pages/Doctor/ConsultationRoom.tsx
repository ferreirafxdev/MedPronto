import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
import { openDocument } from '../../utils/s3';
import { CheckCircle, Edit3, ClipboardList, PenTool, FileText, Download, Send, ShieldCheck } from 'lucide-react';
// Mirotalk WebRTC Integration - Replacing Jitsi

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
        if(r.data.pdf_url) openDocument(r.data.pdf_url);
        alert("✅ Atendimento finalizado!"); navigate('/doctor/dashboard');
      } catch(err) { alert("Erro ao encerrar."); } finally { setLoading(false); }
    }
  };

  const roomName = `MedProntoRoom_Doc_${user?.id?.replace(/[^a-zA-Z0-9]/g, '')}`;

  const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ background: 'var(--accent-ultra-light)', color: 'var(--accent)', padding: '0.45rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
        <Icon size={18} />
      </div>
      <div>
        <h4 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '0.95rem', fontWeight: 700 }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  );

  return (
    <div className="room-full-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Dynamic Minimalist Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              AO VIVO
            </div>
            <div>
               <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>PACIENTE</span>
               <h2 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>{user?.name}</h2>
            </div>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>EM ATENDIMENTO</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e', fontFamily: 'monospace' }}>{formatTime(consultationTime)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <ShieldCheck size={14} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Criptografia Ativa</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/doctor/dashboard')}>Ver Painel</button>
        </div>
      </div>

      <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', overflow: 'hidden' }}>
        {/* Main Video Area */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
           <div style={{ flexGrow: 1, position: 'relative', background: '#000' }}>
              <iframe
                src={`https://p2p.mirotalk.com/join/${roomName}?name=${encodeURIComponent(user?.name || 'Médico')}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; speaker-selection"
              />
           </div>
           
           {/* Chat Overlay (Optional) or bottom bar */}
           <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '320px', maxHeight: '200px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
              <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>MENSAGENS</div>
              <div style={{ flexGrow: 1, padding: '0.75rem', overflowY: 'auto' }}>
                 {messages.length === 0 ? <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Sem mensagens...</p> : messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: '0.4rem' }}>
                       <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{m.sender}: </span>
                       <span style={{ fontSize: '0.75rem', color: 'white' }}>{m.text}</span>
                    </div>
                 ))}
              </div>
              <form onSubmit={sendMessage} style={{ display: 'flex', padding: '0.5rem', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                 <input type="text" className="form-control" style={{ height: '28px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontSize: '0.75rem' }} value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Enviar mensagem..." />
                 <button type="submit" className="btn btn-primary" style={{ width: '28px', height: '28px', padding: 0 }}><Send size={12} /></button>
              </form>
           </div>
        </div>

        {/* Sidebar Medical Tools (Prontuário) */}
        <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: '0.2rem' }}>
            <TabBtn active={activeTab === 'evolucao'} onClick={()=>setActiveTab('evolucao')} icon={Edit3} label="Evolução" />
            <TabBtn active={activeTab === 'receituario'} onClick={()=>setActiveTab('receituario')} icon={PenTool} label="Receita" />
            <TabBtn active={activeTab === 'exames'} onClick={()=>setActiveTab('exames')} icon={ClipboardList} label="Exames" />
            <TabBtn active={activeTab === 'atestado'} onClick={()=>setActiveTab('atestado')} icon={FileText} label="Atestado" />
          </div>

          <div style={{ flexGrow: 1, padding: '1.25rem', overflowY: 'auto' }}>
            {activeTab === 'evolucao' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={Edit3} title="Evolução Clínica" desc="Quadro clínico e anamnese." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '1rem', borderRadius: '1rem' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paciente apresenta..." />
              </div>
            )}
            {activeTab === 'receituario' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={PenTool} title="Receituário" desc="Prescrição digital assinada." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '1rem', borderRadius: '1rem' }} value={prescriptions} onChange={e=>setPrescriptions(e.target.value)} placeholder="1. ..." />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadPDF('receita', { prescriptions }, 'receita.pdf')} disabled={loading}>Rascunho</button>
                  <button className="btn btn-primary btn-sm" onClick={startDigitalSignature} disabled={loading || signingStatus === 'signed'}>
                    {signingStatus === 'signed' ? 'Assinado ✅' : 'Assinar Bird ID'}
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'exames' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={ClipboardList} title="Pedidos de Exame" desc="Solicitações laboratoriais." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '1rem', borderRadius: '1rem' }} value={exams} onChange={e=>setExams(e.target.value)} placeholder="Exames..." />
                <button className="btn btn-primary btn-sm" onClick={() => downloadPDF('exames', { exams }, 'pedido_exame.pdf')} disabled={loading} style={{ marginTop: '1rem' }}>Gerar Pedido</button>
              </div>
            )}
            {activeTab === 'atestado' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={FileText} title="Atestado Médico" desc="Afastamento e justificativa." />
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', border: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                   <div className="form-group"><label style={{ fontSize: '0.7rem', fontWeight: 700 }}>DIAS</label><input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} /></div>
                   <div className="form-group" style={{ marginTop: '0.75rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 700 }}>CID</label><input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Ex: J06" /></div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => downloadPDF('atestado', { daysOff, cid }, 'atestado.pdf')} disabled={loading}>Emitir Atestado</button>
              </div>
            )}
          </div>

          <div style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-primary btn-full btn-lg" onClick={endConsultation} disabled={loading} style={{ background: '#0f172a', borderRadius: '3rem' }}>
              {loading ? "Processando..." : "FINALIZAR ATENDIMENTO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: any; icon: any; label: string }) => (
  <button onClick={onClick} style={{ 
    flex: 1, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '0.4rem', 
    padding: '0.45rem 0.2rem', 
    borderRadius: '0.75rem', 
    border: 'none', 
    background: active ? 'white' : 'transparent', 
    color: active ? 'var(--accent)' : '#64748b', 
    fontSize: '0.75rem', 
    fontWeight: active ? 700 : 500,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s'
  }}>
    <Icon size={14} /> {label}
  </button>
);

export default ConsultationRoom;
