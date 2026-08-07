import { useEffect, useState, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import {
  Edit3, PenTool, FileText, Clock, User,
  Save, AlertCircle, CheckCircle2, Activity,
  ShieldCheck, FileCheck, Stethoscope, History,
  Loader2, ArrowLeft, X, FileSignature, Smartphone
} from 'lucide-react';
import LiveKitVideo from '../../components/LiveKitVideo';

const ConsultationTimer = memo(() => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)] text-[13px] bg-[var(--color-bg-subtle)] px-2.5 py-1 rounded-md border border-[var(--color-border)]">
      <Clock size={14} className="text-[var(--color-brand)]" />
      <span className="font-mono font-semibold text-[var(--color-brand)]">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
});

const ConsultationRoom = () => {
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

  const [notes, setNotes] = useState('');
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [exams, setExams] = useState('');
  const [daysOff, setDaysOff] = useState('1');
  const [cid, setCid] = useState('');
  const [atestadoContent, setAtestadoContent] = useState('');

  const [doctorCpf, setDoctorCpf] = useState(user?.cpf || '');
  const [birdIdStatus, setBirdIdStatus] = useState<'idle' | 'requesting' | 'pending' | 'signed' | 'error'>('idle');
  const [birdIdSessionId, setBirdIdSessionId] = useState<string | null>(null);
  const [birdIdError, setBirdIdError] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    fetchPatientRecord();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [roomId]);

  const fetchPatientRecord = async () => {
    if (!roomId) return;
    setFetchingPatient(true);
    try {
      const resp = await apiClient.get(`/api/doctor/patient/${roomId}/record`);
      if (resp.data.success) {
        setPatientData(resp.data.patient);
        setQueueItem(resp.data.queueItem);
        if (resp.data.record) setHistoryRecord(resp.data.record);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do paciente:', e);
    } finally {
      setFetchingPatient(false);
    }
  };

  const handleStartBirdIdSignature = async () => {
    if (!doctorCpf) { setBirdIdError('Informe o CPF para assinar.'); return; }
    setBirdIdStatus('requesting');
    setBirdIdError(null);
    try {
      const response = await apiClient.post('/api/birdid/start', { cpf: doctorCpf });
      const { sessionId } = response.data;
      if (sessionId) {
        setBirdIdSessionId(sessionId);
        setBirdIdStatus('pending');
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => checkSignatureStatus(sessionId), 2500);
      } else {
        setBirdIdStatus('error');
        setBirdIdError('Nao foi possivel iniciar a sessao de assinatura.');
      }
    } catch (err: any) {
      setBirdIdStatus('error');
      setBirdIdError(err.response?.data?.error || 'Erro ao comunicar com o servidor BirdID.');
    }
  };

  const checkSignatureStatus = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/api/birdid/status/${sessionId}`);
      if (response.data.status === 'ready') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setBirdIdStatus('signed');
      } else if (response.data.status === 'denied') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setBirdIdStatus('error');
        setBirdIdError('Assinatura recusada no aplicativo BirdID.');
      }
    } catch { /* retry */ }
  };

  const handleEndConsultation = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await apiClient.post('/api/end-consultation', {
        patientId: roomId, doctorId: user?.id, notes,
        prescriptions: prescriptionContent, exams,
        atestado: atestadoContent ? { daysOff, cid, content: atestadoContent, birdIdSession: birdIdStatus === 'signed' ? birdIdSessionId : null } : null
      });
      setSavedSuccess(true);
      setTimeout(() => navigate('/doctor/dashboard'), 1500);
    } catch (err: any) {
      alert('Erro ao finalizar consulta: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { key: 'evolucao', icon: <Edit3 size={14} />, label: 'Evolucao' },
    { key: 'receituario', icon: <PenTool size={14} />, label: 'Receituario' },
    { key: 'atestado', icon: <FileText size={14} />, label: 'Atestado' },
    { key: 'exames', icon: <AlertCircle size={14} />, label: 'Exames' },
    { key: 'historico', icon: <History size={14} />, label: 'Historico' },
  ] as const;

  return (
    <div className="consultation-fullscreen flex flex-col bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="h-[52px] flex items-center justify-between px-4 bg-[var(--color-bg-white)] border-b border-[var(--color-border)] flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/doctor/dashboard')} className="btn-secondary py-1.5 px-3 text-[12px]">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Teleconsulta — Dr(a). {user?.name || 'Medico'}
            </span>
          </div>
          <ConsultationTimer />
        </div>
        <div>
          {savedSuccess ? (
            <span className="flex items-center gap-1.5 text-[var(--color-success)] text-[13px] font-medium">
              <CheckCircle2 size={16} /> Finalizado
            </span>
          ) : (
            <button onClick={() => setShowConfirmModal(true)} disabled={loading} className="btn-danger py-1.5 px-4 text-[12px]">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Finalizar Consulta
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Video + Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Video Area */}
        <div className="flex-1 min-w-0 bg-[#111827]">
          {roomId ? (
            <LiveKitVideo roomId={roomId} role="doctor" userName={user?.name || 'Medico'} onLeave={() => navigate('/doctor/dashboard')} />
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF]">
              <Loader2 size={28} className="animate-spin" />
            </div>
          )}
        </div>

        {/* Right Panel - Medical Record */}
        <div className="w-[400px] lg:w-[440px] hidden md:flex flex-col bg-[var(--color-bg-white)] border-l border-[var(--color-border)]">
          {/* Patient Info */}
          <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center">
                <User size={16} className="text-[var(--color-brand)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                  {fetchingPatient ? 'Carregando...' : (patientData?.name || 'Paciente')}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  CPF: {patientData?.cpf || 'N/A'} | Idade: {patientData?.age || 'N/A'}
                </div>
              </div>
            </div>
            {queueItem?.complaint && (
              <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-md px-2.5 py-1.5 text-[12px]">
                <span className="font-semibold text-[var(--color-warning)] text-[10px] uppercase tracking-wider block mb-0.5">Queixa Principal</span>
                <span className="text-[var(--color-text-primary)] font-medium">"{queueItem.complaint}"</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--color-border)] px-1 overflow-x-auto flex-shrink-0 bg-[var(--color-bg-white)]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'evolucao' && (
              <div className="flex flex-col h-full">
                <SectionLabel title="Evolucao Clinica / Anamnese" />
                <textarea className="medical-textarea flex-1 min-h-[180px]" placeholder="Relate sintomas, exame clinico, conduta e orientacoes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            )}
            {activeTab === 'receituario' && (
              <div className="flex flex-col h-full">
                <SectionLabel title="Receituario Medico" />
                <textarea className="medical-textarea flex-1 min-h-[180px] font-mono text-[13px]" placeholder={"1. Amoxicilina 500mg\n   1 capsula de 8/8h por 7 dias\n\n2. Paracetamol 750mg\n   1 comp. de 6/6h se dor ou febre"} value={prescriptionContent} onChange={e => setPrescriptionContent(e.target.value)} />
              </div>
            )}
            {activeTab === 'atestado' && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex items-center justify-between">
                  <SectionLabel title="Atestado de Afastamento" />
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-[var(--color-text-muted)] uppercase mb-0.5">Dias</label>
                      <input type="number" min="1" value={daysOff} onChange={e => setDaysOff(e.target.value)} className="medical-input w-[60px] text-center py-1 text-[13px]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[var(--color-text-muted)] uppercase mb-0.5">CID</label>
                      <input type="text" value={cid} onChange={e => setCid(e.target.value)} placeholder="J06" className="medical-input w-[70px] py-1 text-[13px]" />
                    </div>
                  </div>
                </div>
                <textarea className="medical-textarea flex-1 min-h-[120px]" placeholder="Justificativa do afastamento..." value={atestadoContent} onChange={e => setAtestadoContent(e.target.value)} />

                {/* BirdID Digital Signature */}
                <div className="medical-card p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text-primary)]">
                    <Smartphone size={14} className="text-[var(--color-brand)]" />
                    Assinatura Digital — Soluti BirdID
                  </div>
                  {birdIdStatus === 'idle' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-[var(--color-text-muted)] uppercase mb-0.5">CPF do Medico</label>
                        <input type="text" placeholder="Apenas numeros" value={doctorCpf} onChange={e => setDoctorCpf(e.target.value)} className="medical-input py-1.5 text-[13px]" />
                      </div>
                      <button onClick={handleStartBirdIdSignature} disabled={!atestadoContent} className={`w-full py-1.5 rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 ${atestadoContent ? 'bg-[var(--color-text-primary)] text-white cursor-pointer' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed'}`}>
                        <FileSignature size={13} /> Solicitar Assinatura
                      </button>
                    </div>
                  )}
                  {birdIdStatus === 'requesting' && (
                    <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] py-2">
                      <Loader2 size={14} className="animate-spin text-[var(--color-brand)]" /> Iniciando sessao...
                    </div>
                  )}
                  {birdIdStatus === 'pending' && (
                    <div className="bg-[var(--color-brand-light)] border border-[var(--color-brand-50)] rounded-md p-2.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-brand)] mb-1">
                        <Loader2 size={13} className="animate-spin" /> Aguardando aprovacao no celular
                      </div>
                      <p className="text-[11px] text-[var(--color-brand)] opacity-80">Abra o app BirdID e confirme a assinatura.</p>
                    </div>
                  )}
                  {birdIdStatus === 'signed' && (
                    <div className="bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-md p-2.5 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--color-success)]">Assinado com sucesso</div>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">ID: {birdIdSessionId?.substring(0, 15)}...</span>
                      </div>
                    </div>
                  )}
                  {birdIdStatus === 'error' && (
                    <div>
                      <div className="bg-[var(--color-error-light)] border border-[var(--color-error-border)] rounded-md p-2.5 text-[12px] text-[var(--color-error)]">
                        {birdIdError || 'Erro ao assinar com BirdID.'}
                      </div>
                      <button onClick={() => setBirdIdStatus('idle')} className="text-[var(--color-brand)] text-[11px] font-medium mt-1 cursor-pointer bg-transparent border-none">
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'exames' && (
              <div className="flex flex-col h-full">
                <SectionLabel title="Solicitacao de Exames" />
                <textarea className="medical-textarea flex-1 min-h-[180px]" placeholder={"- Hemograma completo\n- Proteina C Reativa (PCR)\n- Raio-X de Torax (PA)"} value={exams} onChange={e => setExams(e.target.value)} />
              </div>
            )}
            {activeTab === 'historico' && (
              <div className="flex flex-col gap-3">
                <SectionLabel title="Historico do Paciente" />
                {historyRecord.consultations?.length === 0 && historyRecord.atestados?.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-text-muted)] text-[13px] bg-[var(--color-bg-subtle)] rounded-lg">
                    Sem registros anteriores.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyRecord.consultations?.map((item: any) => (
                      <div key={item.id} className="medical-card p-3">
                        <div className="flex justify-between text-[12px] font-medium text-[var(--color-brand)] mb-1">
                          <span>Atendimento Clinico</span>
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {item.notes && <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2">{item.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action */}
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <button onClick={() => setShowConfirmModal(true)} disabled={loading || savedSuccess} className={`w-full py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 ${savedSuccess ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-error)] text-white hover:bg-[#B91C1C]'} ${loading || savedSuccess ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} transition-colors`}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Processando...</>
                : savedSuccess ? <><CheckCircle2 size={14} /> Finalizado</>
                : <><Save size={14} /> Finalizar e Emitir Documentos</>}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fade-in">
          <div className="medical-card max-w-[420px] w-full overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-start">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Concluir Teleconsulta?</h3>
                <p className="text-[12px] text-[var(--color-text-secondary)]">Os seguintes documentos serao emitidos:</p>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 cursor-pointer bg-transparent border-none">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'Evolucao e Anamnese', active: !!notes },
                { label: 'Receituario Medico', active: !!prescriptionContent },
                { label: 'Solicitacao de Exames', active: !!exams },
                { label: `Atestado (${daysOff} dia(s))`, active: !!atestadoContent },
                { label: 'Assinatura Digital BirdID', active: birdIdStatus === 'signed' },
              ].map((doc, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] ${doc.active ? 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]' : 'bg-[var(--color-bg-subtle)] border border-[var(--color-border)]'}`}>
                  {doc.active ? <CheckCircle2 size={14} className="text-[var(--color-success)]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[var(--color-border)]" />}
                  <span className={doc.active ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)]'}>{doc.label}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="btn-secondary flex-1 py-2">Cancelar</button>
              <button onClick={handleEndConsultation} className="btn-danger flex-[2] py-2">Concluir Atendimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ title }: { title: string }) => (
  <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{title}</h4>
);

export default ConsultationRoom;
