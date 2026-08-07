import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  Loader2, Activity, Clock, FileText,
  PlusCircle, ShieldCheck, HeartPulse, UserCheck,
  MessageSquare, AlertCircle, ChevronRight,
  ChevronLeft, Timer, CheckCircle2, RefreshCw
} from 'lucide-react';
import apiClient from '../../api/client';

type QueueStep = 1 | 2 | 3;

interface AnamneseData {
  symptoms: string[];
  customSymptom: string;
  duration: string;
  severity: number;
}

const COMMON_SYMPTOMS = [
  { id: 'fever', label: 'Febre' },
  { id: 'headache', label: 'Dor de Cabeca' },
  { id: 'throat', label: 'Dor de Garganta' },
  { id: 'cough', label: 'Tosse' },
  { id: 'body_pain', label: 'Dor no Corpo' },
  { id: 'breathing', label: 'Falta de Ar' },
  { id: 'nausea', label: 'Nausea / Vomito' },
  { id: 'dizziness', label: 'Tontura' },
  { id: 'chest', label: 'Dor no Peito' },
  { id: 'abdomen', label: 'Dor Abdominal' },
];

const DURATION_OPTIONS = [
  { value: 'today', label: 'Hoje', sub: 'Menos de 24 horas' },
  { value: '2-3days', label: '2 a 3 dias', sub: 'Esta semana' },
  { value: 'week', label: '1 semana', sub: 'Cerca de 7 dias' },
  { value: 'weeks', label: 'Mais de 1 semana', sub: 'Cronico ou recorrente' },
];

const SEVERITY_LABELS = ['Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso'];

const PatientDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [inQueue, setInQueue] = useState(false);
  const [consultationReady, setConsultationReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enqueueLoading, setEnqueueLoading] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [doctorName, setDoctorName] = useState('');

  const [queueStep, setQueueStep] = useState<QueueStep>(1);
  const [anamneseData, setAnamneseData] = useState<AnamneseData>({
    symptoms: [],
    customSymptom: '',
    duration: '',
    severity: 2
  });

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const resp = await apiClient.get(`/api/patient/check-queue/${user.id}`);
      const isNewConsultation = searchParams.get('new_consultation') === 'true' || localStorage.getItem('payment_confirmed') === 'true';
      const isJustRegistered = searchParams.get('just_registered') === 'true';

      if (resp.data.isActive) {
        setInQueue(false);
        setConsultationReady(true);
        setDoctorName(resp.data.doctorName || 'Medico');
        setLoading(false);
        setConsultationRoomId(user.id);
        navigate(`/patient/consultation/${user.id}`, { replace: true });
      } else if (resp.data.inQueue) {
        setInQueue(true);
        setConsultationReady(false);
        setLoading(false);
      } else if (isJustRegistered) {
        const tempComplaint = localStorage.getItem('temp_complaint') || 'Consulta Geral';
        localStorage.removeItem('temp_complaint');
        navigate('/patient/dashboard', { replace: true });
        handleAutoEnqueue(tempComplaint);
      } else if (isNewConsultation) {
        setShowComplaintModal(true);
        setLoading(false);
      } else {
        setInQueue(false);
        setConsultationReady(false);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [user, searchParams, navigate, setConsultationRoomId]);

  useEffect(() => {
    if (!user) { navigate('/patient/login'); return; }
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [user, navigate, checkStatus]);

  const buildComplaintText = (): string => {
    const parts: string[] = [];
    const selectedSymptoms = COMMON_SYMPTOMS
      .filter(s => anamneseData.symptoms.includes(s.id))
      .map(s => s.label);

    if (selectedSymptoms.length > 0) parts.push(selectedSymptoms.join(', '));
    if (anamneseData.customSymptom.trim()) parts.push(anamneseData.customSymptom.trim());

    const durationLabel = DURATION_OPTIONS.find(d => d.value === anamneseData.duration)?.label;
    if (durationLabel) parts.push(`ha ${durationLabel.toLowerCase()}`);

    const severityLabel = SEVERITY_LABELS[anamneseData.severity - 1];
    if (severityLabel) parts.push(`intensidade: ${severityLabel}`);

    return parts.join(' · ') || 'Consulta Geral';
  };

  const handleAutoEnqueue = async (customComplaint: string) => {
    if (!user) return;
    setEnqueueLoading(true);
    try {
      const resp = await apiClient.post('/api/enqueue', { id: user.id, name: user.name, complaint: customComplaint });
      if (resp.data.success) {
        setInQueue(true);
        localStorage.removeItem('payment_confirmed');
      }
    } catch (e: any) {
      if (e.response?.status === 402 || e.response?.data?.requiresPayment) {
        setRequiresPayment(true);
      } else {
        alert(e.response?.data?.error || 'Erro ao entrar na fila.');
      }
    } finally {
      setEnqueueLoading(false);
    }
  };

  const handleEnqueueFinal = async () => {
    if (!user) return;
    setEnqueueLoading(true);
    const complaint = buildComplaintText();
    try {
      const resp = await apiClient.post('/api/enqueue', { id: user.id, name: user.name, complaint });
      if (resp.data.success) {
        setInQueue(true);
        setShowComplaintModal(false);
        localStorage.removeItem('payment_confirmed');
      }
    } catch (e: any) {
      if (e.response?.status === 402 || e.response?.data?.requiresPayment) {
        setRequiresPayment(true);
        setShowComplaintModal(false);
      } else {
        alert(e.response?.data?.error || 'Erro ao entrar na fila.');
      }
    } finally {
      setEnqueueLoading(false);
    }
  };

  const toggleSymptom = (id: string) => {
    setAnamneseData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(id)
        ? prev.symptoms.filter(s => s !== id)
        : [...prev.symptoms, id]
    }));
  };

  const canProceedStep1 = anamneseData.symptoms.length > 0 || anamneseData.customSymptom.trim().length > 0;
  const canProceedStep2 = anamneseData.duration !== '';

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[1.375rem] font-semibold mb-1">
          Ola, {user.name.split(' ')[0]}
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Pronto Atendimento Virtual &mdash; Saude Digital
        </p>
      </div>

      {/* Requires Payment Warning */}
      {requiresPayment && (
        <div className="medical-card border-[var(--color-error-border)] bg-[var(--color-error-light)] p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[var(--color-error)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[14px] font-semibold text-[var(--color-error)] mb-1">Pagamento Pendente</h4>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
                Seu atendimento anterior foi finalizado. Para consultar novamente, realize um novo pagamento.
              </p>
              <button
                onClick={() => navigate('/patient/payment')}
                className="btn-danger text-[13px] py-1.5 px-3"
              >
                Pagar Nova Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 1: Ready to start */}
      {!inQueue && !consultationReady && !requiresPayment && (
        <div className="medical-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center">
              <HeartPulse size={20} className="text-[var(--color-brand)]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold m-0">Medicos Disponiveis</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-[12px] font-medium text-[var(--color-success)]">Atendimento Imediato</span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-5">
            Teleconsulta com medicos capacitados. Emissao digital de receitas, atestados e pedidos de exames com validade legal.
          </p>
          <button
            onClick={() => { setQueueStep(1); setShowComplaintModal(true); }}
            className="btn-primary text-[13px] py-2.5 px-5"
          >
            <PlusCircle size={16} /> Iniciar Atendimento
          </button>
        </div>
      )}

      {/* State 2: In Queue */}
      {inQueue && !consultationReady && (
        <div className="medical-card p-8 mb-6 text-center border-[var(--color-brand-50)] bg-[var(--color-brand-light)]">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-white)] border border-[var(--color-brand-50)] flex items-center justify-center mx-auto mb-4 text-[var(--color-brand)] shadow-xs">
            <Clock size={28} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <h3 className="text-[1.125rem] font-semibold text-[var(--color-text-primary)] mb-1">
            Voce esta na Fila de Espera
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[420px] mx-auto mb-5">
            Mantenha esta pagina aberta. Assim que o medico chamar, voce sera direcionado a sala de video automaticamente.
          </p>

          <div className="flex items-center justify-center gap-6 text-[12px] text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-[var(--color-brand)]" /> Atualizacao ao vivo
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[var(--color-success)]" /> Atendimento seguro
            </span>
          </div>
        </div>
      )}

      {/* State 3: Doctor Called */}
      {consultationReady && (
        <div className="medical-card p-8 mb-6 text-center border-[var(--color-success-border)] bg-[var(--color-success-light)]">
          <div className="w-14 h-14 rounded-full bg-[var(--color-success)] text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
            <UserCheck size={28} />
          </div>
          <h3 className="text-[1.25rem] font-semibold text-[var(--color-text-primary)] mb-1">
            O Medico Chamou Voce
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
            Dr(a). {doctorName} iniciou a teleconsulta. Redirecionando...
          </p>
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--color-success)]">
            <Loader2 size={16} className="animate-spin" /> Conectando a sala...
          </div>
        </div>
      )}

      {/* Quick Shortcuts */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/patient/profile')}
          className="medical-card p-4 hover:border-[var(--color-border-strong)] cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-brand)] mb-3">
            <FileText size={18} />
          </div>
          <h4 className="text-[14px] font-semibold mb-0.5">Meu Prontuario</h4>
          <p className="text-[12px] text-[var(--color-text-secondary)]">Historico de consultas, receitas e atestados</p>
        </div>

        <div
          onClick={() => navigate('/patient/payment')}
          className="medical-card p-4 hover:border-[var(--color-border-strong)] cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-success)] mb-3">
            <ShieldCheck size={18} />
          </div>
          <h4 className="text-[14px] font-semibold mb-0.5">Nova Consulta</h4>
          <p className="text-[12px] text-[var(--color-text-secondary)]">Adquira um novo atendimento medico 24h</p>
        </div>
      </div>

      {/* Modal Multi-Step de Anamnese */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="medical-card max-w-[460px] w-full overflow-hidden shadow-lg animate-slide-up">
            {/* Step Bar */}
            <div className="h-1 bg-[var(--color-bg-subtle)]">
              <div
                className="h-full bg-[var(--color-brand)] transition-all duration-300"
                style={{ width: `${(queueStep / 3) * 100}%` }}
              />
            </div>

            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold m-0">
                  {queueStep === 1 && 'Sintomas Atuais'}
                  {queueStep === 2 && 'Tempo de Sintomas'}
                  {queueStep === 3 && 'Intensidade'}
                </h3>
                <p className="text-[12px] text-[var(--color-text-secondary)] m-0 mt-0.5">
                  {queueStep === 1 && 'Selecione os sintomas ou descreva o que sente'}
                  {queueStep === 2 && 'Informe ha quanto tempo iniciaram os sintomas'}
                  {queueStep === 3 && 'Classifique o nivel de desconforto de 1 a 5'}
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                {queueStep}/3
              </span>
            </div>

            {/* Step 1 */}
            {queueStep === 1 && (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_SYMPTOMS.map(s => {
                    const isSelected = anamneseData.symptoms.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSymptom(s.id)}
                        className={`px-3 py-2 rounded-md text-[13px] font-medium text-left border transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-brand-light)] border-[var(--color-brand-50)] text-[var(--color-brand)]'
                            : 'bg-[var(--color-bg-white)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                        }`}
                      >
                        {s.label}
                        {isSelected && <CheckCircle2 size={14} className="text-[var(--color-brand)]" />}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Outro sintoma nao listado..."
                  value={anamneseData.customSymptom}
                  onChange={e => setAnamneseData(prev => ({ ...prev, customSymptom: e.target.value }))}
                  className="medical-input"
                />
              </div>
            )}

            {/* Step 2 */}
            {queueStep === 2 && (
              <div className="p-5 space-y-2">
                {DURATION_OPTIONS.map(d => {
                  const isSelected = anamneseData.duration === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setAnamneseData(prev => ({ ...prev, duration: d.value }))}
                      className={`w-full p-3 rounded-md text-left border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-brand-light)] border-[var(--color-brand-50)]'
                          : 'bg-[var(--color-bg-white)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      <div>
                        <div className={`text-[13px] font-semibold ${isSelected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-primary)]'}`}>
                          {d.label}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{d.sub}</div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-[var(--color-brand)]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 3 */}
            {queueStep === 3 && (
              <div className="p-5 space-y-4">
                <div className="text-center py-2">
                  <div className="text-[1.25rem] font-bold text-[var(--color-brand)] mb-1">
                    {SEVERITY_LABELS[anamneseData.severity - 1]}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-muted)]">Nivel {anamneseData.severity} de 5</div>
                </div>

                <input
                  type="range" min={1} max={5} step={1}
                  value={anamneseData.severity}
                  onChange={e => setAnamneseData(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                  className="w-full accent-[var(--color-brand)] cursor-pointer"
                />

                <div className="bg-[var(--color-bg-subtle)] p-3 rounded-md border border-[var(--color-border)]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Resumo da Anamnese
                  </div>
                  <div className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">
                    {buildComplaintText()}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex gap-2">
              <button
                onClick={() => {
                  if (queueStep === 1) setShowComplaintModal(false);
                  else setQueueStep(s => (s - 1) as QueueStep);
                }}
                className="btn-secondary py-2 px-4 text-[13px]"
              >
                <ChevronLeft size={16} />
                {queueStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {queueStep < 3 ? (
                <button
                  onClick={() => setQueueStep(s => (s + 1) as QueueStep)}
                  disabled={queueStep === 1 ? !canProceedStep1 : !canProceedStep2}
                  className="btn-primary flex-1 py-2 text-[13px]"
                >
                  Proximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleEnqueueFinal}
                  disabled={enqueueLoading}
                  className="btn-primary flex-1 py-2 text-[13px]"
                >
                  {enqueueLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={16} /> Entrar na Fila
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
