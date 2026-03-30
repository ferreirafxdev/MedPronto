import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
import { CheckCircle, Edit3, ClipboardList, PenTool, FileText, Download, Send } from 'lucide-react';
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
  
  const [messages, setMessages] = useState<{sender: string, text: string, time: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [consultationTime, setConsultationTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
        setConsultationTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if(!user || user.role !== 'doctor') {
      navigate('/doctor/login');
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);

    s.emit('join_room', roomId);
    s.emit('consultation_started', { roomId, doctorId: user.id, doctorName: user.name });

    s.on('receive_message', (data: any) => {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
    });

    return () => {
        s.disconnect();
    };
  }, [roomId, user, navigate]);

  const sendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newMessage.trim() || !socket) return;

      const msg = {
          roomId,
          sender: user?.name || 'Médico',
          text: newMessage
      };

      socket.emit('send_message', msg);
      setMessages(prev => [...prev, { sender: 'Você', text: newMessage, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
      setNewMessage('');
  };

  const downloadPDF = async (endpoint: string, data: any, filename: string) => {
      setLoading(true);
      try {
          const resp = await apiClient.post(`/api/${endpoint}`, {
              patientId: roomId,
              doctorId: user?.id,
              ...data
          }, { responseType: 'blob' });

          const url = window.URL.createObjectURL(new Blob([resp.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          alert(`✅ Documento (${endpoint}) gerado e baixado com sucesso!`);
      } catch (err) {
          console.error(err);
          alert(`Erro ao gerar ${endpoint}.`);
      } finally {
          setLoading(false);
      }
  };

  const generateAtestado = () => downloadPDF('atestado', { daysOff, cid }, `atestado_${roomId?.substring(0,8)}.pdf`);
  const generateReceita = () => downloadPDF('receita', { prescriptions }, `receita_${roomId?.substring(0,8)}.pdf`);
  const generateExames = () => downloadPDF('exames', { exams }, `exames_${roomId?.substring(0,8)}.pdf`);

  const endConsultation = async () => {
      if(window.confirm("Deseja encerrar e gerar o PDF do prontuário? Ele será salvo no Supabase S3.")) {
          setLoading(true);
          try {
             const endResp = await apiClient.post(`/api/end-consultation`, {
                 patientId: roomId,
                 doctorId: user?.id,
                 notes, prescriptions, exams
             });
             
             if(endResp.data.pdf_url) {
                 window.open(endResp.data.pdf_url, '_blank');
             }
             
             alert("✅ Atendimento finalizado! +R$ 60,00 somados. O PDF foi aberto para impressão/S3.");
             navigate('/doctor/dashboard');
          } catch(err) {
             console.error(err);
             alert("Erro ao encerrar consulta");
          } finally {
             setLoading(false);
          }
      }
  };

  const roomName = `MedProntoRoom_Doc_${user?.id?.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ padding: '0 2rem 2rem 2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: '0.8rem 2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
           <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Prontuário de {user?.name}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Atendimento: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>#{roomId?.substring(0,8).toUpperCase()}</span></p>
           </div>
           <div style={{ height: '30px', width: '1px', background: 'var(--border-color)' }}></div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>{formatTime(consultationTime)}</span>
           </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div className="status-badge status-active">Conexão Segura</div>
           <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => navigate('/doctor/dashboard')}>Sair da Sala</button>
        </div>
      </div>

      <div className="consultation-layout" style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div className="video-container" style={{ flexGrow: 1, position: 'relative', minHeight: '400px' }}>
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={roomName}
                    configOverwrite={{
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        prejoinPageEnabled: false,
                        disableDeepLinking: true,
                        toolbarButtons: ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'tileview']
                    }}
                    interfaceConfigOverwrite={{
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                    }}
                    userInfo={{
                        displayName: user?.name || 'Médico',
                        email: user?.email || 'medico@medpronto.com'
                    }}
                    getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; iframeRef.style.border = 'none'; }}
                />
            </div>

            <div className="consultation-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.05)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Chat com Paciente</span>
                    <span className="status-badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>Tempo Real</span>
                </div>
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2rem' }}>Inicie uma conversa com o paciente...</div>
                    ) : (
                        messages.map((m, i) => (
                            <div key={i} style={{ alignSelf: m.sender === 'Você' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textAlign: m.sender === 'Você' ? 'right' : 'left' }}>{m.sender} • {m.time}</div>
                                <div style={{ background: m.sender === 'Você' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: m.sender === 'Você' ? 'white' : 'inherit', padding: '0.6rem 1rem', borderRadius: '1rem', borderTopRightRadius: m.sender === 'Você' ? '0' : '1rem', borderTopLeftRadius: m.sender === 'Você' ? '1rem' : '0', fontSize: '0.9rem', boxShadow: 'var(--shadow-sm)' }}>
                                    {m.text}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="form-control" style={{ borderRadius: '2rem', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." />
                    <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>

        <div className="consultation-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="tabs">
                <div className={`tab ${activeTab === 'evolucao' ? 'active' : ''}`} onClick={()=>setActiveTab('evolucao')}><Edit3 size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Evolução</div>
                <div className={`tab ${activeTab === 'receituario' ? 'active' : ''}`} onClick={()=>setActiveTab('receituario')}><PenTool size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Receita</div>
                <div className={`tab ${activeTab === 'exames' ? 'active' : ''}`} onClick={()=>setActiveTab('exames')}><ClipboardList size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Exames</div>
                <div className={`tab ${activeTab === 'atestado' ? 'active' : ''}`} onClick={()=>setActiveTab('atestado')}><FileText size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Atestado</div>
            </div>

            <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {activeTab === 'evolucao' && (
                    <div className="doc-form-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                           <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>Evolução Clínica</h4>
                           <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descreva a queixa, exame físico e conduta médica.</p>
                        </div>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none', padding: '1rem', borderRadius: '0.5rem', minHeight: '100px' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Paciente apresenta queixa de..."></textarea>
                    </div>
                )}
                {activeTab === 'exames' && (
                    <div className="doc-form-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                           <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>Solicitação de Exames</h4>
                           <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Liste os exames laboratoriais ou de imagem necessários.</p>
                        </div>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none', padding: '1rem', borderRadius: '0.5rem', minHeight: '100px' }} value={exams} onChange={e=>setExams(e.target.value)} placeholder="Ex: Hemograma completo, Creatinina, Raio-X de Tórax..."></textarea>
                        <button className="btn btn-primary" onClick={generateExames} disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                            {loading ? "Gerando..." : <><Download size={18} /> Baixar Pedido de Exames (PDF)</>}
                        </button>
                    </div>
                )}
                {activeTab === 'receituario' && (
                    <div className="doc-form-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                           <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>Receituário Digital</h4>
                           <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prescreva medicamentos, posologia e orientações.</p>
                        </div>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none', padding: '1rem', borderRadius: '0.5rem', minHeight: '100px' }} value={prescriptions} onChange={e=>setPrescriptions(e.target.value)} placeholder="Ex: Dipirona 500mg, 1 comprimido de 6/6h por 3 dias..."></textarea>
                        <button className="btn btn-primary" onClick={generateReceita} disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                            {loading ? "Gerando..." : <><Download size={18} /> Baixar Receita Médica (PDF)</>}
                        </button>
                    </div>
                )}
                {activeTab === 'atestado' && (
                    <div className="doc-form-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                           <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>Atestado Médico</h4>
                           <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Emita o afastamento e CID para o paciente.</p>
                        </div>
                        
                        <div style={{ flexGrow: 1, background: 'rgba(0,0,0,0.1)', padding: '1.5rem', borderRadius: '0.5rem', minHeight: '100px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Dias de Afastamento</label>
                                <input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} min="1" max="30" style={{ background: 'rgba(0,0,0,0.2)', border: 'none' }} />
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>CID-10 (Opcional)</label>
                                <input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Ex: Z00.0" style={{ background: 'rgba(0,0,0,0.2)', border: 'none' }} />
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={generateAtestado} disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                            {loading ? "Processando..." : <><Download size={18} /> Baixar Atestado (PDF)</>}
                        </button>
                    </div>
                )}
            </div>

            <div className="actions-bottom">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)' }}>Auto-save: S3 Ativado</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Log de Auditoria: Ativo</span>
                </div>
                <button className="btn btn-danger" onClick={endConsultation} disabled={loading} style={{ borderRadius: '2rem', padding: '0.85rem 2.5rem' }}>
                    {loading ? "Salvando PDF..." : <><CheckCircle size={20} /> Encerrar Consulta</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
