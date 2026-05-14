import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { Edit3, PenTool, FileText, Clock } from 'lucide-react';
import LiveKitVideo from '../../components/LiveKitVideo';

/**
 * Tela de Sala de Consulta (Médico)
 * Gerencia o vídeo, prontuário, receitas e atestados em tempo real.
 */
const ConsultationRoom = () => {
  const { roomId } = useParams(); // ID da sala (geralmente o ID do paciente)
  const { user } = useStore();    // Dados do médico logado
  const navigate = useNavigate();
  
  // -- Estados da Interface --
  const [activeTab, setActiveTab] = useState<'evolucao' | 'exames' | 'receituario' | 'atestado'>('evolucao');
  const [loading, setLoading] = useState(false);
  const [consultationTime, setConsultationTime] = useState(0); // Cronômetro da consulta

  // -- Conteúdo do Prontuário --
  const [notes, setNotes] = useState('');                 // Evolução clínica
  const [prescriptionContent, setPrescriptionContent] = useState(''); // Texto da receita
  const [exams, setExams] = useState('');                 // Pedidos de exames
  
  // -- Conteúdo do Atestado --
  const [daysOff, setDaysOff] = useState('1');            // Dias de afastamento
  const [cid, setCid] = useState('');                     // CID (opcional)
  const [atestadoContent, setAtestadoContent] = useState(''); // Texto do atestado

  // Inicia o cronômetro ao carregar a página
  useEffect(() => { 
    const t = setInterval(() => setConsultationTime(p => p + 1), 1000); 
    return () => clearInterval(t); 
  }, []);
  
  // Formata segundos em MM:SS
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // Proteção de rota: apenas médicos
  useEffect(() => {
    if (!user || user.role !== 'doctor') { navigate('/doctor/login'); return; }
  }, [user, navigate]);

  /**
   * Finaliza o atendimento enviando todos os dados para o backend
   */
  const endConsultation = async () => {
    if(window.confirm("Deseja encerrar o atendimento e salvar os documentos?")) {
      setLoading(true);
      try {
        await apiClient.post('/api/end-consultation', { 
          patientId: roomId, 
          doctorId: user?.id, 
          notes, 
          prescriptions: prescriptionContent, 
          exams, 
          content: prescriptionContent,
          // Dados do atestado (será processado apenas se houver conteúdo)
          atestado: {
            daysOff,
            cid,
            content: atestadoContent
          }
        });
        navigate('/doctor/dashboard'); // Retorna ao painel após finalizar
      } catch(err) { 
        alert("Erro ao encerrar consulta. Verifique sua conexão."); 
      } finally { 
        setLoading(false); 
      }
    }
  };

  // Componente auxiliar para títulos de seção
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
      {/* Barra de Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800 }}>AO VIVO</div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 700 }}>Consulta Digital</h2>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontFamily: 'monospace', fontWeight: 800 }}>
             <Clock size={16} /> {formatTime(consultationTime)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/doctor/dashboard')}>Ver Painel</button>
        </div>
      </div>

      {/* Grid Principal: Vídeo (Esquerda) e Prontuário (Direita) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px' }}>
        {/* Área de Vídeo */}
        <div style={{ position: 'relative', background: '#000' }}>
           <LiveKitVideo roomName={roomId || 'default'} userName={user?.name || 'Médico'} />
        </div>

        {/* Área Lateral: Prontuário e Abas */}
        <div style={{ background: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
           {/* Seleção de Abas */}
           <div style={{ display: 'flex', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: '0.25rem' }}>
              <TabBtn active={activeTab === 'evolucao'} onClick={()=>setActiveTab('evolucao')} icon={Edit3} label="Evolução" />
              <TabBtn active={activeTab === 'receituario'} onClick={()=>setActiveTab('receituario')} icon={PenTool} label="Receita" />
              <TabBtn active={activeTab === 'atestado'} onClick={()=>setActiveTab('atestado')} icon={FileText} label="Atestado" />
           </div>

           {/* Conteúdo das Abas */}
           <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
              {activeTab === 'evolucao' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={Edit3} title="Evolução do Caso" desc="Anote aqui o quadro clínico e queixas." />
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Digite aqui a evolução..." />
                </div>
              )}
              {activeTab === 'receituario' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={PenTool} title="Prescrição" desc="Medicamentos e dosagens." />
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem', fontFamily: 'monospace' }} value={prescriptionContent} onChange={e=>setPrescriptionContent(e.target.value)} placeholder="Ex: Paracetamol 500mg..." />
                </div>
              )}
              {activeTab === 'atestado' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <SectionHeader icon={FileText} title="Atestado Médico" desc="Emissão de afastamento." />
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', marginBottom: '1rem', border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                     <div><label style={{ fontSize: '0.65rem', fontWeight: 800 }}>DIAS</label><input type="number" className="form-control" value={daysOff} onChange={e=>setDaysOff(e.target.value)} /></div>
                     <div><label style={{ fontSize: '0.65rem', fontWeight: 800 }}>CID</label><input type="text" className="form-control" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Opcional" /></div>
                  </div>
                  <textarea className="form-control" style={{ flex: 1, resize: 'none', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '1rem' }} value={atestadoContent} onChange={e=>setAtestadoContent(e.target.value)} placeholder="Conteúdo do atestado..." />
                </div>
              )}
           </div>

           {/* Botão de Finalização */}
           <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={endConsultation} disabled={loading} style={{ borderRadius: '3rem', height: '56px', fontWeight: 800 }}>
                 {loading ? 'SALVANDO...' : 'FINALIZAR ATENDIMENTO'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// Componente de botão de aba
const TabBtn = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: active ? 'white' : 'transparent', color: active ? '#6366f1' : '#64748b', fontSize: '0.75rem', fontWeight: active ? 700 : 500, transition: 'all 0.2s', boxShadow: active ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}>
    <Icon size={14} /> {label}
  </button>
);

export default ConsultationRoom;
