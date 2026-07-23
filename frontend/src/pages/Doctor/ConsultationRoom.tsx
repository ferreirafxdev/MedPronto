import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { 
  Edit3, PenTool, FileText, Clock, User, 
  ChevronRight, Save, Info, AlertCircle 
} from 'lucide-react';
import DailyVideo from '../../components/DailyVideo';

/**
 * Sala de Consulta Profissional
 * Layout otimizado: Vídeo (Topo Esquerdo), Info Paciente (Topo Direito), Prontuário (Base)
 */
const ConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'evolucao' | 'receituario' | 'atestado' | 'exames'>('evolucao');
  const [loading, setLoading] = useState(false);
  const [consultationTime, setConsultationTime] = useState(0);
  const [patient, setPatient] = useState<any>(null);

  // Estados dos documentos
  const [notes, setNotes] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [atestadoContent, setAtestadoContent] = useState('');

  useEffect(() => { 
    const t = setInterval(() => setConsultationTime(p => p + 1), 1000); 
    fetchPatientData();
    return () => clearInterval(t); 
  }, []);

  const fetchPatientData = async () => {
    try {
        const resp = await apiClient.get(`/api/admin/patients/${roomId}/record`);
        setPatient(resp.data.patient);
    } catch (e) { console.error("Erro ao carregar dados do paciente"); }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s/60);
    const secs = s % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  const endConsultation = async () => {
    if(window.confirm("Deseja finalizar este atendimento? Os documentos serão gerados e salvos.")) {
      setLoading(true);
      try {
        await apiClient.post('/api/end-consultation', { 
          patientId: roomId, 
          doctorId: user?.id, 
          notes, 
          prescriptions: prescriptionContent, 
          exams, 
          atestado: atestadoContent ? { daysOff, cid, content: atestadoContent } : null
        });
        navigate('/doctor/dashboard');
      } catch(err) { 
        alert("Erro ao salvar consulta."); 
      } finally { setLoading(false); }
    }
  };

  return (
    <div style={{ 
        height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', 
        overflow: 'hidden', color: 'white', fontFamily: '"Inter", sans-serif' 
    }}>
      
      {/* Header Premium */}
      <header style={{ 
          padding: '1rem 2rem', background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>SESSÃO CLÍNICA ATIVA | Dr(a). {user?.name}</span>
          </div>
          <div style={{ height: '20px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            <Clock size={16} /> Duração: <span style={{ color: 'white', fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(consultationTime)}</span>
          </div>
        </div>

        <button onClick={endConsultation} className="btn-end">
          <Save size={18} /> FINALIZAR CONSULTA
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.5rem', overflow: 'hidden' }}>
        
        {/* Top Row: Video & Patient Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: '1.5rem', height: '320px' }}>
          
          {/* Video Container */}
          <div style={{ 
              position: 'relative', background: '#000', borderRadius: '1.5rem', 
              overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.05)'
          }}>
             {roomId ? (
                 <DailyVideo roomId={roomId} role="doctor" userName={user?.name || 'Médico'} />
             ) : (
                 <div style={{ color: 'white', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Inicializando sala segura...</div>
             )}
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.7rem', backdropFilter: 'blur(4px)', zIndex: 50, pointerEvents: 'none' }}>
               CONEXÃO ESTÁVEL P2P
            </div>
          </div>

          {/* Patient Info Card */}
          <div style={{ 
              background: 'rgba(30, 41, 59, 0.5)', borderRadius: '1.5rem', 
              padding: '2rem', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
               <div style={{ width: '80px', height: '80px', background: 'var(--accent)', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  <User size={40} color="white" />
               </div>
               <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>{patient?.name || 'Carregando...'}</h2>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                    <span>CPF: {patient?.cpf}</span>
                    <span>•</span>
                    <span>PACIENTE ID: {roomId?.substring(0,8)}</span>
                  </div>
               </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
               <InfoItem label="IDADE" value={patient?.age ? `${patient.age} anos` : '--'} />
               <InfoItem label="SEXO" value="Não Informado" />
               <InfoItem label="TIPO SANGUÍNEO" value="Não Informado" />
            </div>
          </div>
        </div>

        {/* Bottom Row: Tabbed Records */}
        <div style={{ 
            flex: 1, background: '#f8fafc', borderRadius: '1.5rem', 
            color: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Custom Tabs Navigation */}
          <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <RecordTab active={activeTab === 'evolucao'} onClick={() => setActiveTab('evolucao')} icon={<Edit3 size={18}/>} label="EVOLUÇÃO CLÍNICA" />
            <RecordTab active={activeTab === 'receituario'} onClick={() => setActiveTab('receituario')} icon={<PenTool size={18}/>} label="RECEITUÁRIO" />
            <RecordTab active={activeTab === 'atestado'} onClick={() => setActiveTab('atestado')} icon={<FileText size={18}/>} label="ATESTADO MÉDICO" />
            <RecordTab active={activeTab === 'exames'} onClick={() => setActiveTab('exames')} icon={<AlertCircle size={18}/>} label="EXAMES" />
          </div>

          {/* Tab Content Area */}
          <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
             {activeTab === 'evolucao' && (
                <div className="tab-content">
                   <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 800 }}>NOTAS DE EVOLUÇÃO</h3>
                   <textarea 
                     className="record-textarea" 
                     placeholder="Descreva aqui o quadro clínico, anamnese e conduta..."
                     value={notes}
                     onChange={e => setNotes(e.target.value)}
                   />
                </div>
             )}

             {activeTab === 'receituario' && (
                <div className="tab-content">
                   <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 800 }}>PRESCRIÇÃO DIGITAL</h3>
                   <textarea 
                     className="record-textarea" 
                     style={{ fontFamily: 'monospace', color: '#2563eb' }}
                     placeholder="1. Medicamento X - 500mg - 1x ao dia..."
                     value={prescriptionContent}
                     onChange={e => setPrescriptionContent(e.target.value)}
                   />
                </div>
             )}

             {activeTab === 'atestado' && (
                <div className="tab-content">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>ATESTADO MÉDICO</h3>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                         <div className="input-group">
                            <label>DIAS DE AFASTAMENTO</label>
                            <input type="number" value={daysOff} onChange={e => setDaysOff(e.target.value)} />
                         </div>
                         <div className="input-group">
                            <label>CID (OPCIONAL)</label>
                            <input type="text" value={cid} onChange={e => setCid(e.target.value)} placeholder="Ex: Z00" />
                         </div>
                      </div>
                   </div>
                   <textarea 
                     className="record-textarea" 
                     placeholder="O paciente deve permanecer em repouso por..."
                     value={atestadoContent}
                     onChange={e => setAtestadoContent(e.target.value)}
                   />
                </div>
             )}

             {activeTab === 'exames' && (
                <div className="tab-content">
                   <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 800 }}>PEDIDO DE EXAMES</h3>
                   <textarea 
                     className="record-textarea" 
                     placeholder="Descreva os exames solicitados..."
                     value={exams}
                     onChange={e => setExams(e.target.value)}
                   />
                </div>
             )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .btn-end {
           background: #f43f5e; color: white; border: none; padding: 0.75rem 1.5rem;
           border-radius: 0.75rem; font-weight: 800; cursor: pointer; display: flex;
           align-items: center; gap: 0.5rem; transition: all 0.2s;
        }
        .btn-end:hover { background: #e11d48; transform: translateY(-2px); }
        
        .record-textarea {
           width: 100%; height: 320px; border: none; background: white;
           border-radius: 1rem; padding: 2rem; font-size: 1.05rem; line-height: 1.7;
           color: #334155; resize: none; outline: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
           font-family: 'Inter', sans-serif;
        }
        .record-textarea:focus { 
           border-color: var(--accent); 
           box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.15), 0 8px 10px -6px rgba(37, 99, 235, 0.1); 
           transform: translateY(-2px);
        }

        .input-group label { display: block; font-size: 0.65rem; font-weight: 800; color: #64748b; margin-bottom: 0.4rem; letter-spacing: 0.05em; }
        .input-group input { 
            padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; 
            font-weight: 700; width: 140px; outline: none; background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s;
            color: #0f172a; font-size: 0.95rem;
        }
        .input-group input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

      `}</style>
    </div>
  );
};

const InfoItem = ({ label, value }: any) => (
  <div>
    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
    <div style={{ fontWeight: 700 }}>{value}</div>
  </div>
);

const RecordTab = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      padding: '1.25rem 1.5rem', border: 'none', background: 'none',
      color: active ? 'var(--accent)' : '#64748b',
      fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      borderBottom: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
      transition: 'all 0.2s'
    }}
  >
    {icon} {label}
  </button>
);

export default ConsultationRoom;
