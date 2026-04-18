import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
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
        if(r.data.pdf_url) window.open(r.data.pdf_url, '_blank');
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
    </div>
  );

  return (
    <div style={{ padding: '1rem 1.5rem', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'white', padding: '0.75rem 1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente em Atendimento</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 800 }}>{user?.name}</h2>
          </div>
          <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: '#64748b' }}>TEMPO DE CONSULTA</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e', fontFeatureSettings: '"tnum"' }}>{formatTime(consultationTime)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f0f9ff', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid #bae6fd' }}>
            <ShieldCheck size={14} color="#0369a1" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1' }}>SALA CRIPTOGRAFADA</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ borderColor: '#cbd5e1', color: '#64748b' }} onClick={() => navigate('/doctor/dashboard')}>Ver Painel</button>
        </div>
      </div>

      <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', overflow: 'hidden' }}>
        {/* Left: Video and Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div className="video-card" style={{ flexGrow: 1, background: '#0f172a', borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid #334155', position: 'relative' }}>
             <iframe
               src={`https://p2p.mirotalk.com/join/${roomName}?name=${encodeURIComponent(user?.name || 'Médico')}`}
               style={{ width: '100%', height: '100%', border: 'none' }}
               allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; speaker-selection"
             />
          </div>
          <div className="chat-card" style={{ height: '180px', background: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>MENSAGENS</span>
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {messages.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', margin: '1rem 0' }}>Sem mensagens ainda...</p> : messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'Você' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                   <div style={{ background: m.sender === 'Você' ? 'var(--accent)' : '#f1f5f9', color: m.sender === 'Você' ? 'white' : '#334155', padding: '0.4rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 500 }}>{m.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="form-control" style={{ borderRadius: '1rem', fontSize: '0.8rem', height: '32px' }} value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Digite aqui..." />
              <button type="submit" className="btn btn-primary" style={{ height: '32px', width: '32px', padding: 0, minWidth: '32px', borderRadius: '50%' }}><Send size={14} /></button>
            </form>
          </div>
        </div>

        {/* Right: Prontuário Premium */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)' }}>
          {/* Custom Tab Bar */}
          <div style={{ display: 'flex', padding: '0.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: '0.4rem' }}>
            <TabBtn active={activeTab === 'evolucao'} onClick={()=>setActiveTab('evolucao')} icon={Edit3} label="Evolução" />
            <TabBtn active={activeTab === 'receituario'} onClick={()=>setActiveTab('receituario')} icon={PenTool} label="Receita" />
            <TabBtn active={activeTab === 'exames'} onClick={()=>setActiveTab('exames')} icon={ClipboardList} label="Exames" />
            <TabBtn active={activeTab === 'atestado'} onClick={()=>setActiveTab('atestado')} icon={FileText} label="Atestado" />
          </div>

          <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto' }}>
            {activeTab === 'evolucao' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={Edit3} title="Evolução Clínica" desc="Registro detalhado do atendimento e quadro clínico." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #e2e8f0', background: '#fcfdfe', padding: '1rem', lineHeight: '1.5', fontSize: '0.92rem' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paciente queixa-se de..." />
              </div>
            )}
            {activeTab === 'receituario' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={PenTool} title="Receituário Digital" desc="Medicamentos, dosagens e instruções de uso." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #e2e8f0', background: '#fdfcfe', padding: '1rem', lineHeight: '1.5', fontSize: '0.92rem' }} value={prescriptions} onChange={e=>setPrescriptions(e.target.value)} placeholder="1. Amoxicilina 500mg..." />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => downloadPDF('receita', { prescriptions }, 'receita.pdf')} disabled={loading}><Download size={14} /> Rascunho PDF</button>
                  <button className="btn btn-primary" style={{ flex: 1.8 }} onClick={startDigitalSignature} disabled={loading || signingStatus === 'signed'}>
                    {signingStatus === 'signed' ? <><ShieldCheck size={16} /> Emitir & Assinar</> : <><PenTool size={16} /> Assinar Bird ID</>}
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'exames' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={ClipboardList} title="Pedido de Exames" desc="Solicitações laboratoriais ou de imagem." />
                <textarea className="form-control" style={{ flexGrow: 1, resize: 'none', border: '1px solid #e2e8f0', padding: '1rem' }} value={exams} onChange={e=>setExams(e.target.value)} placeholder="Hemograma completo..." />
                <button className="btn btn-primary" onClick={() => downloadPDF('exames', { exams }, 'pedido_exame.pdf')} disabled={loading} style={{ marginTop: '1rem' }}>
                  <Download size={16} /> Gerar Pedido de Exame
                </button>
              </div>
            )}
            {activeTab === 'atestado' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SectionHeader icon={FileText} title="Atestado Médico" desc="Documento de afastamento e justificativa." />
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>DIAS DE AFASTAMENTO</label>
                    <input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} min="1" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>CID-10</label>
                    <input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Ex: J06" />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => downloadPDF('atestado', { daysOff, cid }, 'atestado.pdf')} disabled={loading}>
                  <Download size={16} /> Gerar Atestado PDF
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--mint)', borderRadius: '50%' }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>AUTO-SAVE ATIVO</span>
            </div>
            <button className="btn btn-primary" onClick={endConsultation} disabled={loading} style={{ background: '#0f172a', borderColor: '#0f172a', padding: '0.6rem 2rem', borderRadius: '2rem' }}>
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
