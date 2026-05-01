import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { Edit3, ClipboardList, PenTool, FileText, ShieldCheck, Clock } from 'lucide-react';
import JitsiVideo from '../../components/JitsiVideo';

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
  const [consultationTime, setConsultationTime] = useState(0);
  const [atestadoContent, setAtestadoContent] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');

  useEffect(() => { 
    const t = setInterval(() => setConsultationTime(p => p + 1), 1000); 
    return () => clearInterval(t); 
  }, []);
  
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    if (!user || user.role !== 'doctor') { navigate('/doctor/login'); return; }
  }, [user, navigate]);

  const endConsultation = async () => {
    if(window.confirm("Deseja encerrar o atendimento?")) {
      setLoading(true);
      try {
        await apiClient.post('/api/end-consultation', { 
          patientId: roomId, doctorId: user?.id, notes, prescriptions: prescriptions || prescriptionContent, exams, content: prescriptionContent
        });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800 }}>AO VIVO</div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>Consulta Digital</h2>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontFamily: 'monospace', fontWeight: 800 }}>
             {formatTime(consultationTime)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/doctor/dashboard')}>Ver Painel</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px' }}>
        <div style={{ position: 'relative', background: '#000' }}>
           <JitsiVideo roomName={roomId || 'default'} userName={user?.name || 'Médico'} />
        </div>

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

const TabBtn = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: active ? 'white' : 'transparent', color: active ? '#6366f1' : '#64748b', fontSize: '0.75rem', fontWeight: active ? 700 : 500, transition: 'all 0.2s', boxShadow: active ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}>
    <Icon size={14} /> {label}
  </button>
);

export default ConsultationRoom;
