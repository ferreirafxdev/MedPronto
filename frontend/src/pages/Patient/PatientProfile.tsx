import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  Loader2, User, Stethoscope, PenTool, Shield,
  ArrowLeft, Hash, Mail, Calendar, Download,
  Clock, ClipboardList, Lock, CheckCircle
} from 'lucide-react';
import apiClient from '../../api/client';
import { openDocument } from '../../utils/s3';

interface Consultation {
  id: string;
  created_at: string;
  doctor_name: string;
  doctor_crm: string;
  notes: string;
  prescriptions: string;
  exams: string;
  pdf_path: string;
  receita_pdf_url?: string;
  exames_pdf_url?: string;
  download_released: boolean;
}

interface ProfileData {
  patient: {
    name: string;
    cpf: string;
    email: string;
    age: string;
    created_at: string;
  };
  summary: {
    totalConsultations: number;
    totalAtestados: number;
    lastVisit: string;
  };
  consultations: Consultation[];
  atestados: {
    id: string;
    code: string;
    created_at: string;
    doctor_name: string;
    doctor_crm: string;
    days_off: number;
    cid: string;
    content: string;
    pdf_url?: string;
    download_released: boolean;
  }[];
}

const PatientProfile = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'consultas' | 'receitas' | 'atestados'>('overview');
  const [selectedAtestado, setSelectedAtestado] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/patient/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const resp = await apiClient.get(`/api/patient/history/${user?.cpf}`);
      if (resp.data.success) {
        setData(resp.data);
        if (resp.data.atestados && resp.data.atestados.length > 0) {
          setSelectedAtestado(resp.data.atestados[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', icon: <User size={15} />, label: 'Visao Geral' },
    { key: 'consultas', icon: <Stethoscope size={15} />, label: 'Consultas' },
    { key: 'receitas', icon: <PenTool size={15} />, label: 'Receitas e Exames' },
    { key: 'atestados', icon: <Shield size={15} />, label: 'Atestados' },
  ];

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.375rem] font-semibold mb-0.5">Meu Prontuario Digital</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Historico de saude, receitas, exames e atestados
          </p>
        </div>
        <button
          onClick={() => navigate('/patient/dashboard')}
          className="btn-secondary py-1.5 px-3 text-[12px]"
        >
          <ArrowLeft size={14} /> Voltar ao Painel
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="medical-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-light)] border border-[var(--color-brand-50)] flex items-center justify-center text-[var(--color-brand)]">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-[1.125rem] font-semibold text-[var(--color-text-primary)] mb-1">
                {data?.patient?.name || user.name}
              </h2>
              <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <Hash size={13} /> {data?.patient?.cpf || 'CPF nao informado'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {data?.patient?.email || 'Sem e-mail'}
                </span>
                {data?.patient?.age && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {data.patient.age} anos
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-l border-[var(--color-border)] pl-4">
            <div className="text-center">
              <span className="block text-[1.125rem] font-bold text-[var(--color-brand)]">
                {data?.summary?.totalConsultations || 0}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">Consultas</span>
            </div>
            <div className="text-center">
              <span className="block text-[1.125rem] font-bold text-[var(--color-success)]">
                {data?.summary?.totalAtestados || 0}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">Atestados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs + Main Content */}
      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        {/* Left Navigation */}
        <div className="space-y-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer text-left ${
                activeTab === t.key
                  ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Panel Content */}
        <div className="medical-card p-6 min-h-[400px]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
                Informacoes Cadastrais
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoField label="Nome Completo" value={data?.patient?.name || ''} />
                <InfoField label="CPF" value={data?.patient?.cpf || ''} />
                <InfoField label="E-mail" value={data?.patient?.email || ''} />
                <InfoField label="Idade" value={data?.patient?.age ? `${data.patient.age} anos` : 'Nao informada'} />
                <InfoField label="Data de Cadastro" value={data?.patient?.created_at ? new Date(data.patient.created_at).toLocaleDateString('pt-BR') : '-'} />
                <InfoField label="Ultima Consulta" value={data?.summary?.lastVisit ? new Date(data.summary.lastVisit).toLocaleDateString('pt-BR') : 'Nenhuma'} />
              </div>

              {data && data.consultations.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
                    Consultas Recentes
                  </h4>
                  <div className="space-y-2">
                    {data.consultations.slice(0, 3).map(c => (
                      <ConsultationCard key={c.id} consultation={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONSULTAS */}
          {activeTab === 'consultas' && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
                Historico de Atendimentos
              </h3>
              {data && data.consultations.length === 0 ? (
                <EmptyState icon={<Stethoscope size={36} />} text="Voce ainda nao realizou nenhuma consulta." />
              ) : (
                data?.consultations.map(c => <ConsultationCard key={c.id} consultation={c} expanded />)
              )}
            </div>
          )}

          {/* TAB 3: RECEITAS E EXAMES */}
          {activeTab === 'receitas' && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
                Receitas e Pedidos de Exames
              </h3>
              {data && data.consultations.filter(c => c.prescriptions || c.exams).length === 0 ? (
                <EmptyState icon={<PenTool size={36} />} text="Nenhuma receita ou pedido de exame emitido." />
              ) : (
                data?.consultations.filter(c => c.prescriptions || c.exams).map(c => (
                  <div key={c.id} className="border border-[var(--color-border)] rounded-md p-4 space-y-3 bg-[var(--color-bg-subtle)]">
                    <div className="flex justify-between items-center text-[12px] text-[var(--color-text-secondary)] pb-2 border-b border-[var(--color-border)]">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock size={13} /> {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-semibold text-[var(--color-brand)]">Dr(a). {c.doctor_name}</span>
                    </div>

                    {c.prescriptions && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[var(--color-brand)] uppercase tracking-wider">Receita Medica</span>
                          <DownloadButton released={c.download_released} onClick={() => c.receita_pdf_url && openDocument(c.receita_pdf_url)} label="Baixar PDF" />
                        </div>
                        <p className="text-[13px] text-[var(--color-text-primary)] whitespace-pre-wrap font-mono bg-white p-2.5 rounded border border-[var(--color-border)] leading-relaxed">
                          {c.prescriptions}
                        </p>
                      </div>
                    )}

                    {c.exams && (
                      <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[var(--color-success)] uppercase tracking-wider">Solicitacao de Exames</span>
                          <DownloadButton released={c.download_released} onClick={() => c.exames_pdf_url && openDocument(c.exames_pdf_url)} label="Baixar Pedido" />
                        </div>
                        <p className="text-[13px] text-[var(--color-text-primary)] whitespace-pre-wrap font-mono bg-white p-2.5 rounded border border-[var(--color-border)] leading-relaxed">
                          {c.exams}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ATESTADOS */}
          {activeTab === 'atestados' && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-4">
                Atestados Medicos Emitidos
              </h3>
              {data && data.atestados.length === 0 ? (
                <EmptyState icon={<Shield size={36} />} text="Nenhum atestado emitido ate o momento." />
              ) : (
                <div className="grid lg:grid-cols-[220px_1fr] gap-4">
                  {/* List */}
                  <div className="space-y-1 border-r border-[var(--color-border)] pr-3">
                    {data?.atestados.map(a => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAtestado(a)}
                        className={`p-2.5 rounded-md text-[12px] cursor-pointer border transition-colors ${
                          selectedAtestado?.id === a.id
                            ? 'bg-[var(--color-brand-light)] border-[var(--color-brand-50)] text-[var(--color-brand)]'
                            : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
                        }`}
                      >
                        <div className="font-semibold">{a.doctor_name}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')} &middot; {a.days_off} dia(s)
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview Area */}
                  <div className="space-y-3">
                    {selectedAtestado ? (
                      <div className="border border-[var(--color-border)] rounded-md p-6 bg-white space-y-4 text-center">
                        <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider pb-2 border-b border-[var(--color-border)]">
                          Atestado Medico
                        </h4>
                        <div className="text-[13px] text-[var(--color-text-primary)] text-left leading-relaxed whitespace-pre-wrap py-2">
                          {selectedAtestado.content || `Atesto que o paciente ${data?.patient.name}, portador do CPF ${data?.patient.cpf}, necessita de ${selectedAtestado.days_off} dia(s) de afastamento das atividades laborais a contar desta data.\n\nCID: ${selectedAtestado.cid || 'Nao informado'}`}
                        </div>
                        <div className="pt-4 text-center">
                          <div className="text-[13px] font-semibold">Dr(a). {selectedAtestado.doctor_name}</div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">CRM {selectedAtestado.doctor_crm}</div>
                        </div>
                        <div className="text-[10px] font-mono text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
                          Codigo de Validacao: {selectedAtestado.code}
                        </div>
                        <div className="pt-2 flex justify-end">
                          <DownloadButton
                            released={selectedAtestado.download_released}
                            onClick={() => selectedAtestado.pdf_url && openDocument(selectedAtestado.pdf_url)}
                            label="Baixar PDF do Atestado"
                          />
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon={<Shield size={32} />} text="Selecione um atestado para visualizar." />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* Helper Subcomponents */
const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[var(--color-bg-subtle)] p-3 rounded-md border border-[var(--color-border)]">
    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
      {label}
    </span>
    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{value}</span>
  </div>
);

const DownloadButton = ({ released, onClick, label }: { released: boolean; onClick: () => void; label: string }) => {
  if (!released) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-muted)]">
        <Lock size={12} /> Aguardando liberacao
      </span>
    );
  }
  return (
    <button onClick={onClick} className="btn-secondary py-1 px-2.5 text-[11px]">
      <Download size={12} /> {label}
    </button>
  );
};

const ConsultationCard = ({ consultation, expanded }: { consultation: Consultation; expanded?: boolean }) => (
  <div className="border border-[var(--color-border)] rounded-md p-3.5 bg-[var(--color-bg-subtle)] space-y-2">
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[var(--color-text-muted)] flex items-center gap-1">
        <Clock size={12} /> {new Date(consultation.created_at).toLocaleDateString('pt-BR')}
      </span>
      <span className="font-semibold text-[var(--color-brand)]">Dr(a). {consultation.doctor_name}</span>
    </div>
    {expanded && consultation.notes && (
      <div className="pt-1">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">Anotacoes Clinicas</span>
        <p className="text-[12px] text-[var(--color-text-primary)] whitespace-pre-wrap mt-0.5 m-0 leading-relaxed">
          {consultation.notes}
        </p>
      </div>
    )}
  </div>
);

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="text-center py-12 text-[var(--color-text-muted)] space-y-2">
    <div className="opacity-40 flex justify-center">{icon}</div>
    <p className="text-[13px] font-medium m-0">{text}</p>
  </div>
);

export default PatientProfile;
