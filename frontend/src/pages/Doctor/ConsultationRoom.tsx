import React, { useEffect, useState, memo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import {
  Edit3, PenTool, FileText, Clock, User,
  Save, AlertCircle, CheckCircle2,
  Activity, ShieldCheck, FileCheck, Stethoscope, History, Loader2, ArrowLeft, X,
  FileSignature, ChevronLeft, ChevronRight, Smartphone
} from 'lucide-react';
import TRTCVideo from '../../components/TRTCVideo';

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
 * Layout:
 * - Fundo: Vídeo em tela cheia (100% width/height)
 * - Direita: Painel lateral de Prontuário deslizante (Drawer)
 * - Botão flutuante para mostrar/ocultar o prontuário
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

  // Controle do Painel Lateral
  const [panelOpen, setPanelOpen] = useState(true);

  // Campos do Prontuário
  const [notes, setNotes] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [atestadoContent, setAtestadoContent] = useState('');

  // Estados do Processo de Assinatura Digital Soluti BirdID
  const [doctorCpf, setDoctorCpf] = useState(user?.cpf || '');
  const [birdIdStatus, setBirdIdStatus] = useState<'idle' | 'requesting' | 'pending' | 'signed' | 'error'>('idle');
  const [birdIdSessionId, setBirdIdSessionId] = useState<string | null>(null);
  const [birdIdError, setBirdIdError] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    fetchPatientRecord();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
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
   * Dispara o fluxo de assinatura digital no celular do médico
   */
  const handleStartBirdIdSignature = async () => {
    if (!doctorCpf) {
      setBirdIdError('Por favor, informe seu CPF para assinar.');
      return;
    }
    setBirdIdStatus('requesting');
    setBirdIdError(null);
    
    try {
      const response = await apiClient.post('/api/birdid/start', { cpf: doctorCpf });
      const { sessionId } = response.data;
      
      if (sessionId) {
        setBirdIdSessionId(sessionId);
        setBirdIdStatus('pending');
        
        // Inicia o Polling de validação de status a cada 2.5s
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => checkSignatureStatus(sessionId), 2500);
      } else {
        setBirdIdStatus('error');
        setBirdIdError('Não foi possível iniciar a sessão de assinatura.');
      }
    } catch (err: any) {
      setBirdIdStatus('error');
      setBirdIdError(err.response?.data?.error || 'Erro ao comunicar com o servidor BirdID.');
    }
  };

  /**
   * Consulta o status da assinatura em background
   */
  const checkSignatureStatus = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/api/birdid/status/${sessionId}`);
      const { status } = response.data;
      
      if (status === 'ready') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setBirdIdStatus('signed');
      } else if (status === 'denied') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setBirdIdStatus('error');
        setBirdIdError('Assinatura recusada no aplicativo BirdID.');
      }
    } catch (e) {
      // Falhas temporárias de rede continuam o polling
    }
  };

  /**
   * Finaliza a consulta médica e emite os documentos
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
          ? { 
              daysOff, 
              cid, 
              content: atestadoContent,
              birdIdSession: birdIdStatus === 'signed' ? birdIdSessionId : null 
            }
          : null
      });

      setSavedSuccess(true);
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
      background: '#020617',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: 'white',
      fontFamily: '"Inter", sans-serif',
      position: 'relative'
    }}>

      {/* ─── Header Principal (Fixo no Topo) ─── */}
      <header style={{
        padding: '0.75rem 1.25rem',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 40,
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
              <CheckCircle2 size={20} /> Atendimento Concluído!
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

      {/* ─── Vídeo de Chamada (Fundo Fullscreen) ─── */}
      <div style={{
        position: 'absolute',
        top: '65px',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        background: '#020617'
      }}>
        {roomId ? (
          <TRTCVideo
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
            <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite' }} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>Inicializando teleconsulta...</span>
          </div>
        )}
      </div>

      {/* ─── Botão Flutuante para Mostrar/Ocultar o Prontuário ─── */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          right: panelOpen ? '490px' : '2.5rem',
          zIndex: 35,
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: 'white',
          border: 'none',
          padding: '0.9rem 1.6rem',
          borderRadius: '2rem',
          fontWeight: 800,
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 10px 25px rgba(37,99,235,0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <FileText size={18} />
        {panelOpen ? 'Ocultar Prontuário' : 'Abrir Prontuário (Ficha)'}
      </button>

      {/* ─── Painel Lateral Deslizante (Drawer) ─── */}
      <div style={{
        position: 'absolute',
        top: '65px',
        bottom: 0,
        right: 0,
        width: '460px',
        background: '#ffffff',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: '#0f172a',
        borderLeft: '1px solid #e2e8f0'
      }}>
        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          
          {/* Card do Paciente Integrado */}
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                <User size={22} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fetchingPatient ? 'Buscando cadastro...' : (patientData?.name || 'Paciente em Atendimento')}
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>CPF: {patientData?.cpf || 'N/A'}</span>
              </div>
            </div>

            {/* Queixa Principal */}
            {queueItem?.complaint && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '0.6rem', padding: '0.6rem 0.85rem', fontSize: '0.82rem'
              }}>
                <span style={{ fontWeight: 900, color: '#ef4444', fontSize: '0.65rem', display: 'block', marginBottom: '0.15rem', letterSpacing: '0.04em' }}>
                  🚨 FILA: QUEIXA DECLARADA
                </span>
                <span style={{ color: '#7f1d1d', fontWeight: 600 }}>"{queueItem.complaint}"</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <InfoBadge label="IDADE" value={patientData?.age ? `${patientData.age} anos` : 'N/A'} />
              <InfoBadge label="NASCIMENTO" value={patientData?.birth_date || 'N/A'} />
            </div>
          </div>

          {/* Abas do Prontuário */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 0.5rem',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <RecordTab active={activeTab === 'evolucao'} onClick={() => setActiveTab('evolucao')} icon={<Edit3 size={15} />} label="EVOLUÇÃO" />
            <RecordTab active={activeTab === 'receituario'} onClick={() => setActiveTab('receituario')} icon={<PenTool size={15} />} label="RECEITUÁRIO" />
            <RecordTab active={activeTab === 'atestado'} onClick={() => setActiveTab('atestado')} icon={<FileText size={15} />} label="ATESTADO" />
            <RecordTab active={activeTab === 'exames'} onClick={() => setActiveTab('exames')} icon={<AlertCircle size={15} />} label="EXAMES" />
            <RecordTab active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<History size={15} />} label="HISTÓRICO" />
          </div>

          {/* Área de edição da Aba */}
          <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            
            {activeTab === 'evolucao' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <TabHeader title="EVOLUÇÃO CLÍNICA / ANAMNESE" subtitle="Anotações internas de prontuário" />
                <textarea
                  className="record-textarea"
                  placeholder="Relate sintomas, exame clínico, conduta adotada e orientações..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ flex: 1, minHeight: '180px' }}
                />
              </div>
            )}

            {activeTab === 'receituario' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <TabHeader title="RECEITUÁRIO MÉDICO" subtitle="Geração de receita digital para o paciente" />
                <textarea
                  className="record-textarea"
                  style={{ fontFamily: 'monospace', color: '#1e40af', flex: 1, minHeight: '180px' }}
                  placeholder={`1. Uso Oral: Amoxicilina 500mg\n   Tomar 1 cápsula de 8 em 8 horas por 7 dias.\n\n2. Paracetamol 750mg\n   Tomar 1 comp. de 6 em 6h se dor ou febre.`}
                  value={prescriptionContent}
                  onChange={e => setPrescriptionContent(e.target.value)}
                />
              </div>
            )}

            {activeTab === 'atestado' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
                  <h3 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>
                    ATESTADO DE AFASTAMENTO
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="input-group">
                      <label>DIAS</label>
                      <input type="number" min="1" value={daysOff} onChange={e => setDaysOff(e.target.value)} style={{ width: '60px' }} />
                    </div>
                    <div className="input-group">
                      <label>CID</label>
                      <input type="text" value={cid} onChange={e => setCid(e.target.value)} placeholder="Ex: J06" style={{ width: '70px' }} />
                    </div>
                  </div>
                </div>
                
                <textarea
                  className="record-textarea"
                  placeholder="Justifico que o paciente necessita de afastamento por motivo de tratamento médico..."
                  value={atestadoContent}
                  onChange={e => setAtestadoContent(e.target.value)}
                  style={{ flex: 1, minHeight: '130px', marginBottom: '1rem' }}
                />

                {/* ─── MÓDULO DE ASSINATURA DIGITAL BIRDID ─── */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.85rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smartphone size={18} color="#2563eb" />
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>
                      Assinatura Digital Soluti BirdID
                    </span>
                  </div>

                  {birdIdStatus === 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="input-group" style={{ width: '100%' }}>
                        <label>CPF DO MÉDICO TITULAR</label>
                        <input 
                          type="text" 
                          placeholder="Apenas números" 
                          value={doctorCpf}
                          onChange={e => setDoctorCpf(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        onClick={handleStartBirdIdSignature}
                        disabled={!atestadoContent}
                        style={{
                          background: atestadoContent ? '#1e293b' : '#cbd5e1',
                          color: atestadoContent ? 'white' : '#94a3b8',
                          border: 'none', padding: '0.6rem', borderRadius: '0.5rem',
                          fontWeight: 800, fontSize: '0.75rem', cursor: atestadoContent ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                        }}
                      >
                        <FileSignature size={14} /> Solicitar Assinatura no App
                      </button>
                    </div>
                  )}

                  {birdIdStatus === 'requesting' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569', padding: '0.5rem 0' }}>
                      <Loader2 size={16} className="animate-spin" color="#3b82f6" />
                      Iniciando sessão de assinatura BirdID...
                    </div>
                  )}

                  {birdIdStatus === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 700 }}>
                        <Loader2 size={14} className="animate-spin" />
                        Aguardando aprovação no seu celular BirdID
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#1e3a8a', lineHeight: 1.3 }}>
                        Enviamos uma notificação push. Abra o app BirdID no seu celular e confirme a assinatura digital deste atestado.
                      </span>
                    </div>
                  )}

                  {birdIdStatus === 'signed' && (
                    <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <div>
                        <div style={{ color: '#065f46', fontWeight: 800, fontSize: '0.78rem' }}>Atestado Assinado com Sucesso!</div>
                        <span style={{ fontSize: '0.65rem', color: '#047857', fontFamily: 'monospace' }}>ID: {birdIdSessionId?.substring(0, 15)}...</span>
                      </div>
                    </div>
                  )}

                  {birdIdStatus === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fecdd3', color: '#991b1b', fontSize: '0.78rem', lineHeight: 1.3 }}>
                        ⚠️ {birdIdError || 'Erro ao assinar com BirdID.'}
                      </div>
                      <button 
                        onClick={() => setBirdIdStatus('idle')} 
                        style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left' }}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'exames' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <TabHeader title="SOLICITAÇÃO DE EXAMES" subtitle="Requisição de análises e exames de imagem" />
                <textarea
                  className="record-textarea"
                  placeholder={`- Hemograma completo\n- Proteína C Reativa (PCR)\n- Raio-X de Tórax (PA)`}
                  value={exams}
                  onChange={e => setExams(e.target.value)}
                  style={{ flex: 1, minHeight: '180px' }}
                />
              </div>
            )}

            {activeTab === 'historico' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', flex: 1 }}>
                <TabHeader title="HISTÓRICO DO PACIENTE" subtitle="Histórico de passagens anteriores na clínica" />
                
                {historyRecord.consultations?.length === 0 && historyRecord.atestados?.length === 0 ? (
                  <div style={{
                    padding: '2.5rem', textAlign: 'center', color: '#94a3b8',
                    background: '#f8fafc', borderRadius: '0.85rem', border: '1px solid #e2e8f0', fontSize: '0.85rem'
                  }}>
                    Sem registros anteriores cadastrados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {historyRecord.consultations?.map((item: any) => (
                      <div key={item.id} style={{
                        padding: '0.75rem 0.85rem', background: '#f8fafc',
                        borderRadius: '0.75rem', border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.2rem' }}>
                          <span>Atendimento Clínico</span>
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                            {item.notes.substring(0, 100)}{item.notes.length > 100 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Action Bar Inferior no Painel */}
          <div style={{
            padding: '1rem',
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading || savedSuccess}
              style={{
                width: '100%',
                background: savedSuccess
                  ? '#059669'
                  : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                color: 'white', border: 'none',
                padding: '0.85rem', borderRadius: '0.75rem',
                fontWeight: 800, fontSize: '0.88rem',
                cursor: (loading || savedSuccess) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /><span>PROCESSANDO...</span></>
              ) : savedSuccess ? (
                <><CheckCircle2 size={16} /><span>FINALIZADO!</span></>
              ) : (
                <><Save size={16} /><span>FINALIZAR E ENVIAR RECEITA</span></>
              )}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.7rem' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Assinatura Digital integrada via banco e Soluti</span>
            </div>
          </div>

        </div>
      </div>

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
            maxWidth: '440px', width: '100%',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'white' }}>
                  Concluir Teleconsulta?
                </h3>
                <p style={{ margin: '0.3rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Os seguintes itens serão disponibilizados:
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista */}
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { icon: '📋', label: 'Evolução e Anamnese de Prontuário', active: !!notes },
                { icon: '💊', label: 'Receituário de Medicamentos', active: !!prescriptionContent },
                { icon: '🔬', label: 'Solicitações de Exames', active: !!exams },
                { icon: '📄', label: `Atestado de Afastamento (${daysOff} dias)`, active: !!atestadoContent },
                { icon: '📱', label: 'Assinatura Digital (Soluti BirdID)', active: birdIdStatus === 'signed' },
              ].map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                  background: doc.active ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${doc.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{doc.icon}</span>
                  <span style={{ fontSize: '0.8rem', color: doc.active ? '#a7f3d0' : '#64748b', fontWeight: 600 }}>
                    {doc.label}
                  </span>
                  {doc.active && (
                    <CheckCircle2 size={12} color="#10b981" style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Aviso */}
            <div style={{
              margin: '0 1.5rem',
              padding: '0.65rem 0.85rem',
              background: 'rgba(244, 63, 94, 0.06)',
              border: '1px solid rgba(244, 63, 94, 0.15)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem', color: '#fda4af', lineHeight: 1.3
            }}>
              ⚠️ O paciente receberá a receita e o atestado na tela dele instantaneamente via WebSocket.
            </div>

            {/* Botões */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', padding: '0.75rem', borderRadius: '0.75rem',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleEndConsultation}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                  color: 'white', border: 'none',
                  padding: '0.75rem', borderRadius: '0.75rem',
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                Concluir Atendimento
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .record-textarea {
          width: 100%; border: 1px solid #cbd5e1; background: #ffffff;
          border-radius: 0.75rem; padding: 0.85rem; font-size: 0.9rem;
          line-height: 1.5; color: #0f172a; resize: none; outline: none;
          transition: all 0.2s ease; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
          box-sizing: border-box; font-family: 'Inter', sans-serif;
        }
        .record-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .input-group label { display: block; font-size: 0.58rem; font-weight: 900; color: #64748b; margin-bottom: 0.2rem; letter-spacing: 0.05em; }
        .input-group input { padding: 0.45rem 0.6rem; border-radius: 0.4rem; border: 1px solid #cbd5e1; font-weight: 700; outline: none; background: white; color: #0f172a; font-size: 0.8rem; }
        .input-group input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; box-shadow: 0 0 10px #10b981; } 50% { opacity: 0.6; box-shadow: 0 0 20px #10b981; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

// ─── Componentes auxiliares ───

const TabHeader = ({ title, subtitle, subtitleColor = '#64748b' }: {
  title: string; subtitle: string; subtitleColor?: string
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexShrink: 0 }}>
    <h3 style={{ fontSize: '0.82rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>{title}</h3>
    <span style={{ fontSize: '0.68rem', color: subtitleColor, fontWeight: 700 }}>{subtitle}</span>
  </div>
);

const InfoBadge = ({ label, value }: { label: string; value: string }) => (
  <div style={{
    background: '#ffffff', padding: '0.45rem 0.65rem',
    borderRadius: '0.5rem', border: '1px solid #e2e8f0', flex: 1
  }}>
    <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>{label}</div>
    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{value}</div>
  </div>
);

const RecordTab = ({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.75rem 0.85rem', border: 'none', background: 'none',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.35rem',
      borderBottom: `2.5px solid ${active ? '#2563eb' : 'transparent'}`,
      transition: 'all 0.2s ease', whiteSpace: 'nowrap'
    }}
  >
    {icon} {label}
  </button>
);

export default ConsultationRoom;
