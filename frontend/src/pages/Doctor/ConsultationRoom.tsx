import React, { useEffect, useState, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { 
  Edit3, PenTool, FileText, Clock, User, 
  Save, Info, AlertCircle, CheckCircle2, 
  Activity, ShieldCheck, FileCheck, Stethoscope, History, Loader2, ArrowLeft
} from 'lucide-react';
import DailyVideo from '../../components/DailyVideo';

/**
 * Componente isolado para o Cronômetro de Atendimento
 * Evita que o re-render de 1 segundo afete a sala inteira e trave o vídeo WebRTC
 */
const ConsultationTimer = memo(() => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Clock size={16} color="#38bdf8" />
      <span>Duração:</span>
      <span style={{ color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace', fontSize: '1rem' }}>{formatted}</span>
    </div>
  );
});

/**
 * Sala de Consulta Médica Profissional (Prontuário + WebRTC P2P)
 */
const ConsultationRoom: React.FC = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'evolucao' | 'receituario' | 'atestado' | 'exames' | 'historico'>('evolucao');
  const [loading, setLoading] = useState(false);
  const [fetchingPatient, setFetchingPatient] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [queueItem, setQueueItem] = useState<any>(null);
  const [historyRecord, setHistoryRecord] = useState<any>({ consultations: [], atestados: [] });

  // Campos do Prontuário
  const [notes, setNotes] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [atestadoContent, setAtestadoContent] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchPatientRecord();
  }, [roomId]);

  const fetchPatientRecord = async () => {
    if (!roomId) return;
    setFetchingPatient(true);
    try {
      const resp = await apiClient.get(`/api/doctor/patient/${roomId}/record`);
      if (resp.data.success) {
        setPatientData(resp.data.patient);
        setQueueItem(resp.data.queueItem);
        if (resp.data.record) {
          setHistoryRecord(resp.data.record);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do paciente:', e);
    } finally {
      setFetchingPatient(false);
    }
  };

  const handleEndConsultation = async () => {
    if (!window.confirm('Deseja finalizar este atendimento? Os documentos (receita/atestado) serão assinados e o PDF será gerado.')) {
      return;
    }

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

      setSavedSuccess(true);
      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 1200);
    } catch (err: any) {
      alert('Erro ao finalizar consulta: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: '#090d16',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: 'white',
      fontFamily: '"Inter", sans-serif'
    }}>

      {/* Header Profissional */}
      <header style={{
        padding: '0.85rem 1.5rem',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',

        alignItems: 'center',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button 
            onClick={() => navigate('/doctor/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '0.5rem', borderRadius: '0.6rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Sair
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
              SESSÃO CLÍNICA | Dr(a). {user?.name || 'Médico'}
            </span>
          </div>

          <ConsultationTimer />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={handleEndConsultation} 
            disabled={loading}
            className="btn-end-consultation"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>FINALIZAR CONSULTA</span>
          </button>
        </div>
      </header>

      {/* Área Principal em Grid Responsivo */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '440px 1fr',
        gap: '1.25rem',
        padding: '1.25rem',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>

        {/* Coluna Esquerda: Vídeo WebRTC + Card do Paciente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>
          
          {/* Container do Vídeo WebRTC */}
          <div style={{
            height: '290px',
            background: '#020617',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            {roomId ? (
              <DailyVideo roomId={roomId} role="doctor" userName={user?.name || 'Médico'} />
            ) : (
              <div style={{ color: '#94a3b8', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                Inicializando videochamada...
              </div>
            )}
          </div>

          {/* Card Detalhado do Paciente & Queixa */}
          <div style={{
            flex: 1,
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '1rem',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(37,99,235,0.4)'
              }}>
                <User size={28} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fetchingPatient ? 'Carregando dados...' : (patientData?.name || 'Paciente Em Atendimento')}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  <span>CPF: {patientData?.cpf || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Queixa Principal do Atendimento */}
            {queueItem?.complaint && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f87171', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={14} /> QUEIXA PRINCIPAL / SINTOMAS
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fecdd3', lineHeight: 1.4, fontWeight: 600 }}>
                  "{queueItem.complaint}"
                </div>
              </div>
            )}

            {/* Dados Demográficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <InfoBadge label="IDADE" value={patientData?.age ? `${patientData.age} anos` : 'Não informada'} />
              <InfoBadge label="DATA NASCIMENTO" value={patientData?.birth_date || 'Não informada'} />
            </div>

            {/* Resumo do Histórico */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.5rem' }}>
                HISTÓRICO NO SISTEMA
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Stethoscope size={14} color="#38bdf8" /> {historyRecord.consultations?.length || 0} Consultas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FileCheck size={14} color="#34d399" /> {historyRecord.atestados?.length || 0} Atestados
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Coluna Direita: Prontuário Médico com Abas e Ação de Finalizar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '1.25rem',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          {/* Navegação por Abas */}
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 1rem',
            overflowX: 'auto'
          }}>
            <RecordTab active={activeTab === 'evolucao'} onClick={() => setActiveTab('evolucao')} icon={<Edit3 size={18} />} label="EVOLUÇÃO CLÍNICA" />
            <RecordTab active={activeTab === 'receituario'} onClick={() => setActiveTab('receituario')} icon={<PenTool size={18} />} label="RECEITUÁRIO" />
            <RecordTab active={activeTab === 'atestado'} onClick={() => setActiveTab('atestado')} icon={<FileText size={18} />} label="ATESTADO MÉDICO" />
            <RecordTab active={activeTab === 'exames'} onClick={() => setActiveTab('exames')} icon={<AlertCircle size={18} />} label="EXAMES" />
            <RecordTab active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<History size={18} />} label="HISTÓRICO ANTERIOR" />
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {activeTab === 'evolucao' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    EVOLUÇÃO CLÍNICA E ANAMNESE
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Registrado no prontuário do paciente</span>
                </div>
                <textarea
                  className="record-textarea"
                  placeholder="Descreva a anamnese, histórico de sintomas, exame físico e conduta médica..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ flex: 1, minHeight: '260px' }}
                />
              </div>
            )}

            {activeTab === 'receituario' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    PRESCRIÇÃO DE MEDICAMENTOS (RECEITUÁRIO)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>Gerará PDF com Assinatura Digital</span>
                </div>
                <textarea
                  className="record-textarea"
                  style={{ fontFamily: 'monospace', color: '#1e40af', flex: 1, minHeight: '260px' }}
                  placeholder="1. Amoxicilina 500mg - Tomar 1 comprimido de 8/8h por 7 dias.&#10;2. Paracetamol 750mg - Tomar 1 comprimido de 6/6h em caso de dor ou febre."
                  value={prescriptionContent}
                  onChange={e => setPrescriptionContent(e.target.value)}
                />
              </div>
            )}

            {activeTab === 'atestado' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    ATESTADO MÉDICO DE AFASTAMENTO
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="input-group">
                      <label>DIAS DE AFASTAMENTO</label>
                      <input type="number" min="1" value={daysOff} onChange={e => setDaysOff(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>CID (OPCIONAL)</label>
                      <input type="text" value={cid} onChange={e => setCid(e.target.value)} placeholder="Ex: J06.9" />
                    </div>
                  </div>
                </div>
                <textarea
                  className="record-textarea"
                  placeholder="Atesto para os devidos fins que o(a) paciente acima citado(a) necessita de repouso por motivo de saúde..."
                  value={atestadoContent}
                  onChange={e => setAtestadoContent(e.target.value)}
                  style={{ flex: 1, minHeight: '220px' }}
                />
              </div>
            )}

            {activeTab === 'exames' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    SOLICITAÇÃO DE EXAMES COMPLEMENTARES
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Impresso juntamente com o receituário</span>
                </div>
                <textarea
                  className="record-textarea"
                  placeholder="Solicito os seguintes exames laboratoriais / de imagem:&#10;- Hemograma completo&#10;- Raio-X de Tórax (AP e Perfil)"
                  value={exams}
                  onChange={e => setExams(e.target.value)}
                  style={{ flex: 1, minHeight: '260px' }}
                />
              </div>
            )}

            {activeTab === 'historico' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                  HISTÓRICO CLÍNICO ANTERIOR DO PACIENTE
                </h3>

                {historyRecord.consultations?.length === 0 && historyRecord.atestados?.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '1rem' }}>
                    Nenhum atendimento anterior registrado para este paciente.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {historyRecord.consultations?.map((item: any) => (
                      <div key={item.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>
                          <span>Consulta por {item.doctor_name || 'Médico'}</span>
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {item.notes && <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.4rem' }}>{item.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Barra de Ação Inferior com o Botão de Finalizar Consulta */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',

            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#64748b', fontSize: '0.85rem' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span>Documentos validados e salvos no PostgreSQL</span>
            </div>

            <button
              onClick={handleEndConsultation}
              disabled={loading}
              className="btn-end-consultation-large"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>GERANDO DOCUMENTOS...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>CONSULTA FINALIZADA!</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>FINALIZAR CONSULTA E EMITIR PDF</span>
                </>
              )}
            </button>
          </div>

        </div>

      </main>

      <style>{`
        .btn-end-consultation {
          background: #f43f5e;
          color: white;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 0.75rem;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
        }
        .btn-end-consultation:hover {
          background: #e11d48;
          transform: translateY(-1px);
        }
        
        .btn-end-consultation-large {
          background: linear-gradient(135deg, #e11d48, #f43f5e);
          color: white;
          border: none;
          padding: 0.85rem 1.75rem;
          border-radius: 0.85rem;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          transition: all 0.2s ease;
          box-shadow: 0 10px 20px -5px rgba(244, 63, 94, 0.4);
        }
        .btn-end-consultation-large:hover {
          background: linear-gradient(135deg, #be123c, #e11d48);
          transform: translateY(-2px);
          box-shadow: 0 14px 25px -5px rgba(244, 63, 94, 0.5);
        }
        .btn-end-consultation-large:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .record-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 0.85rem;
          padding: 1.25rem;
          font-size: 1rem;
          line-height: 1.6;
          color: #0f172a;
          resize: none;
          outline: none;
          transition: all 0.2s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .record-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .input-group label {
          display: block;
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          margin-bottom: 0.3rem;
          letter-spacing: 0.05em;
        }
        .input-group input {
          padding: 0.6rem 0.85rem;
          border-radius: 0.6rem;
          border: 1px solid #cbd5e1;
          font-weight: 700;
          width: 130px;
          outline: none;
          background: white;
          color: #0f172a;
          font-size: 0.9rem;
        }
        .input-group input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const InfoBadge = ({ label, value }: { label: string, value: string }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem 0.85rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{value}</div>
  </div>
);

const RecordTab = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    style={{
      padding: '1rem 1.25rem',
      border: 'none',
      background: 'none',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: 800,
      fontSize: '0.75rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      borderBottom: `3px solid ${active ? '#2563eb' : 'transparent'}`,
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap'
    }}
  >
    {icon} {label}
  </button>
);

export default ConsultationRoom;
