import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { CheckCircle, Edit3, ClipboardList, PenTool } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';

const ConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<'evolucao' | 'exames' | 'encaminhamentos'>('evolucao');
  
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [exams, setExams] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(!user || user.role !== 'doctor') {
      navigate('/doctor/login');
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(s);

    s.emit('join_room', roomId);
    // Notifica o paciente para entrar nesta mesma sala
    s.emit('consultation_started', { roomId, doctorId: user.id, doctorName: user.name });

    return () => {
        s.disconnect();
    };
  }, [roomId, user, navigate]);

  const endConsultation = async () => {
      if(window.confirm("Deseja encerrar e gerar o PDF do prontuário? Ele será salvo no Supabase S3.")) {
          setLoading(true);
          try {
             const endResp = await axios.post('http://localhost:3001/api/end-consultation', {
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

  // The fixed room name for the doctor so they can stay in their unique Jitsi room.
  const roomName = `MedProntoRoom_Doc_${user?.id?.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ padding: '0 2rem 2rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: '1rem 2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div>
           <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Consultório de {user?.name}</h2>
           <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Atendimento do Paciente #{roomId?.substring(0,8)}</p>
        </div>
        <div className="status-badge status-active">Online Localhost</div>
      </div>

      <div className="consultation-layout">
        
        {/* Left: Jitsi Video Area */}
        <div className="video-container" style={{ position: 'relative' }}>
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
                }}
                userInfo={{
                    displayName: user?.name || 'Médico'
                }}
                getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; iframeRef.style.border = 'none'; }}
            />
        </div>

        {/* Right: Prontuário Médico Digital */}
        <div className="consultation-panel">
            <div className="tabs">
                <div className={`tab ${activeTab === 'evolucao' ? 'active' : ''}`} onClick={()=>setActiveTab('evolucao')}><Edit3 size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Evolução</div>
                <div className={`tab ${activeTab === 'exames' ? 'active' : ''}`} onClick={()=>setActiveTab('exames')}><ClipboardList size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Exames</div>
                <div className={`tab ${activeTab === 'encaminhamentos' ? 'active' : ''}`} onClick={()=>setActiveTab('encaminhamentos')}><PenTool size={18} style={{ marginBottom: '-3px', marginRight: '5px' }} /> Receita</div>
            </div>

            <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'evolucao' && (
                    <div className="form-group" style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0 }}>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anamnese e Evolução Clínica do paciente..."></textarea>
                    </div>
                )}
                {activeTab === 'exames' && (
                    <div className="form-group" style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0 }}>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none' }} value={exams} onChange={e=>setExams(e.target.value)} placeholder="Pedido de Exames (Hemograma, Raio-X, etc)..."></textarea>
                    </div>
                )}
                {activeTab === 'encaminhamentos' && (
                    <div className="form-group" style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0 }}>
                        <textarea className="form-control" style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', resize: 'none' }} value={prescriptions} onChange={e=>setPrescriptions(e.target.value)} placeholder="Receituário e Medicamentos..."></textarea>
                    </div>
                )}
            </div>

            {/* Bottom: Action Buttons */}
            <div className="actions-bottom">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-save: S3 Ativado</span>
                <button className="btn btn-danger" onClick={endConsultation} disabled={loading} style={{ borderRadius: '2rem', padding: '0.85rem 2rem' }}>
                    {loading ? "Salvando PDF..." : <><CheckCircle size={20} /> Encerrar e Salvar Prontuário</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
