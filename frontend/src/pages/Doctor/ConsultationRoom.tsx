import React, { useEffect, useState, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import {
  Edit3, PenTool, FileText, Clock, User,
  Save, AlertCircle, CheckCircle2,
  Activity, ShieldCheck, FileCheck, Stethoscope, History, Loader2, ArrowLeft, X
} from 'lucide-react';
import VideoSDKVideo from '../../components/VideoSDKVideo';

/**
 * Cronômetro de Atendimento — memorizado para não re-renderizar toda a sala a cada segundo
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      color: '#94a3b8', fontSize: '0.9rem',
      background: 'rgba(255,255,255,0.05)',
      padding: '0.4rem 0.8rem', borderRadius: '0.75rem',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <Clock size={16} color="#38bdf8" />
      <span>Duração:</span>
      <span style={{ color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace', fontSize: '1rem' }}>
        {formatted}
      </span>
    </div>
  );
});

/**
 * Sala de Consulta Médica Profissional
 * 
 * Layout: Grid de duas colunas
 * - Esquerda: Vídeo VideoSDK (paciente fullscreen, self-view no canto sup. esq.) + dados do paciente
 * - Direita: Prontuário médico (evolução, receita, atestado, exames, histórico)
 * 
 * Finalização: Automática e em tempo real via WebSocket
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
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Campos do Prontuário
  const [notes, setNotes] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [atestadoContent, setAtestadoContent] = useState('');

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

  /**
   * Finaliza a consulta — COMPLETAMENTE AUTOMÁTICO
   * Não há mais confirm() de browser. O médico vê um modal premium de confirmação.
   */
  const handleEndConsultation = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await apiClient.post('/api/end-consultation', {
        patientId: roomId,
        doctorId: user?.id,
        notes,
        prescriptions: prescriptionContent,
        exams,
        atestado: atestadoContent
          ? { daysOff, cid, content: atestadoContent }
          : null
      });

      setSavedSuccess(true);
      // Navega após breve animação de sucesso
      setTimeout(() => navigate('/doctor/dashboard'), 1500);
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

      {/* ─── Header ─── */}
      <header style={{
        padding: '0.75rem 1.25rem',
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '0.5rem 0.75rem', borderRadius: '0.6rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Sair
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#10b981', boxShadow: '0 0 10px #10b981',
              animation: 'pulse-dot 2s ease-in-out infinite'
            }} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
              SESSÃO CLÍNICA · Dr(a). {user?.name || 'Médico'}
            </span>
          </div>

          <ConsultationTimer />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {savedSuccess ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: '#10b981', fontWeight: 800, fontSize: '0.9rem'
            }}>
              <CheckCircle2 size={20} /> Consulta Finalizada!
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading}
              style={{
                background: loading ? 'rgba(244,63,94,0.5)' : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                color: 'white', border: 'none',
                padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                fontWeight: 800, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(244, 63, 94, 0.35)'
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              FINALIZAR CONSULTA
            </button>
          )}
        </div>
      </header>

      {/* ─── Área Principal ─── */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        gap: '1rem',
        padding: '1rem',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>

        {/* ─── Coluna Esquerda: Vídeo + Card do Paciente ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>

          {/* Container de Vídeo VideoSDK WebRTC */}
          <div style={{
            height: '280px',
            background: '#020617',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            flexShrink: 0
          }}>
            {roomId ? (
              <VideoSDKVideo
                roomId={roomId}
                role="doctor"
                userName={user?.name || 'Médico'}
                onLeave={() => navigate('/doctor/dashboard')}
              />
            ) : (
              <div style={{
                color: '#94a3b8', display: 'flex', height: '100%',
                alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem'
              }}>
                <Loader2 size={28} style={{ animation: 'spin 1.5s linear infinite' }} color="#38bdf8" />
                <span>Inicializando videochamada...</span>
              </div>
            )}
          </div>

          {/* Card do Paciente */}
          <div style={{
            flex: 1,
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            minHeight: 0
          }}>
            {/* Avatar e Nome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '1rem', flexShrink: 0,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(37,99,235,0.4)'
              }}>
                <User size={26} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontSize: '1.1rem', margin: 0, fontWeight: 800, color: 'white',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {fetchingPatient ? 'Carregando...' : (patientData?.name || 'Paciente em Atendimento')}
                </h3>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  CPF: {patientData?.cpf || 'Não informado'}
                </div>
              </div>
            </div>

            {/* Queixa Principal */}
            {queueItem?.complaint && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 900, color: '#f87171',
                  letterSpacing: '0.05em', marginBottom: '0.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}>
                  <Activity size={12} /> QUEIXA PRINCIPAL
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fecdd3', lineHeight: 1.4, fontWeight: 600 }}>
                  "{queueItem.complaint}"
                </div>
              </div>
            )}

            {/* Dados Demográficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <InfoBadge label="IDADE" value={patientData?.age ? `${patientData.age} anos` : 'N/A'} />
              <InfoBadge label="NASCIMENTO" value={patientData?.birth_date || 'N/A'} />
            </div>

            {/* Histórico */}
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                HISTÓRICO NO SISTEMA
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Stethoscope size={13} color="#38bdf8" />
                  {historyRecord.consultations?.length || 0} Consultas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FileCheck size={13} color="#34d399" />
                  {historyRecord.atestados?.length || 0} Atestados
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Coluna Direita: Prontuário Médico ─── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '1.25rem',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          minHeight: 0
        }}>
          {/* Abas do Prontuário */}
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 1rem',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <RecordTab active={activeTab === 'evolucao'} onClick={() => setActiveTab('evolucao')} icon={<Edit3 size={16} />} label="EVOLUÇÃO" />
            <RecordTab active={activeTab === 'receituario'} onClick={() => setActiveTab('receituario')} icon={<PenTool size={16} />} label="RECEITUÁRIO" />
            <RecordTab active={activeTab === 'atestado'} onClick={() => setActiveTab('atestado')} icon={<FileText size={16} />} label="ATESTADO" />
            <RecordTab active={activeTab === 'exames'} onClick={() => setActiveTab('exames')} icon={<AlertCircle size={16} />} label="EXAMES" />
            <RecordTab active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<History size={16} />} label="HISTÓRICO" />
          </div>

          {/* Conteúdo da aba ativa */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {activeTab === 'evolucao' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <TabHeader
                  title="EVOLUÇÃO CLÍNICA E ANAMNESE"
                  subtitle="Registrado no prontuário digital do paciente"
                />
                <textarea
                  className="record-textarea"
                  placeholder="Descreva a anamnese, histórico de sintomas, exame físico e conduta médica..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ flex: 1, minHeight: '220px' }}
                />
              </div>
            )}

            {activeTab === 'receituario' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <TabHeader
                  title="PRESCRIÇÃO DE MEDICAMENTOS"
                  subtitle="PDF gerado automaticamente com assinatura digital"
                  subtitleColor="#2563eb"
                />
                <textarea
                  className="record-textarea"
                  style={{ fontFamily: 'monospace', color: '#1e40af', flex: 1, minHeight: '220px' }}
                  placeholder={`1. Amoxicilina 500mg - Tomar 1 comprimido de 8/8h por 7 dias.\n2. Paracetamol 750mg - Tomar 1 comprimido de 6/6h em caso de dor ou febre.`}
                  value={prescriptionContent}
                  onChange={e => setPrescriptionContent(e.target.value)}
                />
              </div>
            )}

            {activeTab === 'atestado' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
                  <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    ATESTADO MÉDICO DE AFASTAMENTO
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                  placeholder="Atesto para os devidos fins que o(a) paciente acima necessita de repouso por motivo de saúde..."
                  value={atestadoContent}
                  onChange={e => setAtestadoContent(e.target.value)}
                  style={{ flex: 1, minHeight: '180px' }}
                />
              </div>
            )}

            {activeTab === 'exames' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <TabHeader
                  title="SOLICITAÇÃO DE EXAMES COMPLEMENTARES"
                  subtitle="Impresso juntamente com o receituário"
                />
                <textarea
                  className="record-textarea"
                  placeholder={`Solicito os seguintes exames:\n- Hemograma completo\n- Raio-X de Tórax (AP e Perfil)`}
                  value={exams}
                  onChange={e => setExams(e.target.value)}
                  style={{ flex: 1, minHeight: '220px' }}
                />
              </div>
            )}

            {activeTab === 'historico' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                  HISTÓRICO CLÍNICO ANTERIOR
                </h3>
                {historyRecord.consultations?.length === 0 && historyRecord.atestados?.length === 0 ? (
                  <div style={{
                    padding: '3rem', textAlign: 'center', color: '#94a3b8',
                    background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0'
                  }}>
                    Nenhum atendimento anterior registrado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {historyRecord.consultations?.map((item: any) => (
                      <div key={item.id} style={{
                        padding: '0.85rem 1rem', background: '#f8fafc',
                        borderRadius: '0.75rem', border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb' }}>
                          <span>Consulta por {item.doctor_name || 'Médico'}</span>
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.3rem', lineHeight: 1.4 }}>
                            {item.notes.substring(0, 120)}{item.notes.length > 120 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de ação inferior */}
          <div style={{
            padding: '1rem 1.25rem',
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.82rem' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Documentos salvos com assinatura digital no PostgreSQL</span>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading || savedSuccess}
              style={{
                background: savedSuccess
                  ? 'linear-gradient(135deg, #059669, #10b981)'
                  : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                color: 'white', border: 'none',
                padding: '0.8rem 1.5rem', borderRadius: '0.85rem',
                fontWeight: 800, fontSize: '0.9rem',
                cursor: (loading || savedSuccess) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: savedSuccess
                  ? '0 8px 20px rgba(16,185,129,0.35)'
                  : '0 8px 20px rgba(244,63,94,0.35)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /><span>GERANDO...</span></>
              ) : savedSuccess ? (
                <><CheckCircle2 size={18} /><span>FINALIZADO!</span></>
              ) : (
                <><Save size={18} /><span>FINALIZAR E EMITIR DOCUMENTOS</span></>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ─── Modal de Confirmação Premium ─── */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(9, 13, 22, 0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem', animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            maxWidth: '460px', width: '100%',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header do modal */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>
                  Finalizar Atendimento?
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Os seguintes documentos serão gerados automaticamente:
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de documentos */}
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { icon: '📋', label: 'Evolução Clínica / Anamnese', active: !!notes },
                { icon: '💊', label: 'Receituário Médico', active: !!prescriptionContent },
                { icon: '🔬', label: 'Solicitação de Exames', active: !!exams },
                { icon: '📄', label: `Atestado de ${daysOff} dia(s)`, active: !!atestadoContent },
              ].map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
                  background: doc.active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${doc.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`
                }}>
                  <span style={{ fontSize: '1rem' }}>{doc.icon}</span>
                  <span style={{ fontSize: '0.85rem', color: doc.active ? '#a7f3d0' : '#475569', fontWeight: 600 }}>
                    {doc.label}
                  </span>
                  {doc.active && (
                    <CheckCircle2 size={14} color="#10b981" style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Aviso */}
            <div style={{
              margin: '0 1.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '0.65rem',
              fontSize: '0.8rem', color: '#fda4af', lineHeight: 1.4
            }}>
              ⚠️ Esta ação encerrará a sessão de vídeo e notificará o paciente em tempo real.
            </div>

            {/* Botões */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', padding: '0.85rem', borderRadius: '0.85rem',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEndConsultation}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                  color: 'white', border: 'none',
                  padding: '0.85rem', borderRadius: '0.85rem',
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem',
                  boxShadow: '0 8px 20px rgba(244, 63, 94, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <Save size={16} /> Confirmar e Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .record-textarea {
          width: 100%; border: 1px solid #cbd5e1; background: #ffffff;
          border-radius: 0.85rem; padding: 1rem; font-size: 0.95rem;
          line-height: 1.6; color: #0f172a; resize: none; outline: none;
          transition: all 0.2s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          box-sizing: border-box; font-family: 'Inter', sans-serif;
        }
        .record-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .input-group label { display: block; font-size: 0.6rem; font-weight: 900; color: #64748b; margin-bottom: 0.25rem; letter-spacing: 0.05em; }
        .input-group input { padding: 0.55rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; font-weight: 700; width: 110px; outline: none; background: white; color: #0f172a; font-size: 0.85rem; }
        .input-group input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; box-shadow: 0 0 10px #10b981; } 50% { opacity: 0.6; box-shadow: 0 0 20px #10b981; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

// ─── Componentes auxiliares ───

const TabHeader = ({ title, subtitle, subtitleColor = '#64748b' }: {
  title: string; subtitle: string; subtitleColor?: string
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
    <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>{title}</h3>
    <span style={{ fontSize: '0.7rem', color: subtitleColor, fontWeight: 700 }}>{subtitle}</span>
  </div>
);

const InfoBadge = ({ label, value }: { label: string; value: string }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', padding: '0.55rem 0.75rem',
    borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.06)'
  }}>
    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{value}</div>
  </div>
);

const RecordTab = ({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.85rem 1rem', border: 'none', background: 'none',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      borderBottom: `2px solid ${active ? '#2563eb' : 'transparent'}`,
      transition: 'all 0.2s ease', whiteSpace: 'nowrap'
    }}
  >
    {icon} {label}
  </button>
);

export default ConsultationRoom;
