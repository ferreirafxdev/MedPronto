import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Loader2, User, Stethoscope, PenTool, Shield, 
  ArrowLeft, Hash, Mail, Calendar, Download, 
  Clock, ClipboardList, Lock, CheckCircle, Send
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
        if (resp.data.atestados.length > 0) {
          setSelectedAtestado(resp.data.atestados[0]);
        }
      }

    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', icon: <User size={15} />, label: 'Visão Geral' },
    { key: 'consultas', icon: <Stethoscope size={15} />, label: 'Consultas' },
    { key: 'receitas', icon: <PenTool size={15} />, label: 'Receitas & Exames' },
    { key: 'atestados', icon: <Shield size={15} />, label: 'Atestados' },
  ];

  return (
    <div className="dashboard-container">
      {/* Back button + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/patient/dashboard')} style={{ gap: '0.3rem' }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.1rem' }}>
            Meu <span className="text-gradient">Perfil</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Histórico completo e documentos emitidos</p>
        </div>
      </div>

      {/* Profile Card + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: 'var(--bg-white)', padding: '1.25rem', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: '0.85rem', gridColumn: 'span 2',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent), var(--mint))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-accent)', flexShrink: 0,
          }}>
            <User size={26} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading)' }}>{data?.patient.name}</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              <InfoPill icon={<Hash size={12} />} text={data?.patient.cpf || ''} />
              <InfoPill icon={<Mail size={12} />} text={data?.patient.email || ''} />
              <InfoPill icon={<Calendar size={12} />} text={`${data?.patient.age} anos`} />
            </div>
          </div>
        </div>

        <StatMini icon={<Stethoscope size={18} />} bg="var(--accent-ultra-light)" color="var(--accent)" label="Consultas" value={data?.summary.totalConsultations || 0} />
        <StatMini icon={<Shield size={18} />} bg="var(--mint-light)" color="var(--mint)" label="Atestados" value={data?.summary.totalAtestados || 0} />
      </div>

      {/* Tabs + Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.55rem 0.8rem', borderRadius: 'var(--radius-sm)',
                border: activeTab === t.key ? '1px solid var(--accent-light)' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem',
                fontWeight: activeTab === t.key ? 600 : 500,
                color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                background: activeTab === t.key ? 'var(--accent-ultra-light)' : 'transparent',
                transition: 'all 0.15s var(--ease)', textAlign: 'left',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </aside>

        <main style={{
          background: 'var(--bg-white)', padding: '1.5rem', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', minHeight: '400px',
        }}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Resumo da Conta</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <InfoField label="Nome Completo" value={data?.patient.name || ''} />
                <InfoField label="CPF" value={data?.patient.cpf || ''} />
                <InfoField label="E-mail" value={data?.patient.email || ''} />
                <InfoField label="Idade" value={`${data?.patient.age} anos`} />
                <InfoField label="Cadastrado em" value={data?.patient.created_at ? new Date(data.patient.created_at).toLocaleDateString('pt-BR') : '—'} />
                <InfoField label="Última Consulta" value={data?.summary.lastVisit ? new Date(data.summary.lastVisit).toLocaleDateString('pt-BR') : 'Nenhuma'} />
              </div>

              {data && data.consultations.length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: '0.65rem' }}>Últimas Consultas</h4>
                  {data.consultations.slice(0, 3).map(c => (
                    <ConsultationCard key={c.id} consultation={c} />
                  ))}
                </>
              )}

              {data && data.consultations.length === 0 && (
                <EmptyState icon={<Stethoscope size={48} />} text="Nenhuma consulta realizada ainda." />
              )}
            </div>
          )}

          {/* CONSULTAS */}
          {activeTab === 'consultas' && (
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Histórico de Consultas</h3>
              {data && data.consultations.length === 0 ? (
                <EmptyState icon={<Stethoscope size={48} />} text="Você ainda não realizou nenhuma consulta." />
              ) : (
                data?.consultations.map(c => <ConsultationCard key={c.id} consultation={c} expanded />)
              )}
            </div>
          )}

          {/* RECEITAS & EXAMES */}
          {activeTab === 'receitas' && (
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Receitas & Exames Emitidos</h3>
              {data && data.consultations.filter(c => c.prescriptions || c.exams).length === 0 ? (
                <EmptyState icon={<PenTool size={48} />} text="Nenhuma receita ou exame emitido." />
              ) : (
                data?.consultations.filter(c => c.prescriptions || c.exams).map(c => (
                  <div key={c.id} style={{
                    background: 'var(--bg-subtle)', padding: '1.1rem', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)', marginBottom: '0.65rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>Dr(a). {c.doctor_name}</span>
                      </div>
                    </div>

                    {c.prescriptions && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <PenTool size={13} color="var(--accent)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Receita</span>
                          </div>
                          <DownloadButton released={c.download_released} onClick={() => c.receita_pdf_url && openDocument(c.receita_pdf_url)} label="Baixar Receita" />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.prescriptions}</p>
                      </div>
                    )}
 
                    {c.exams && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <ClipboardList size={13} color="var(--mint)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exames Solicitados</span>
                          </div>
                          <DownloadButton released={c.download_released} onClick={() => c.exames_pdf_url && openDocument(c.exames_pdf_url)} label="Baixar Pedido" />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.exams}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ATESTADOS */}
          {activeTab === 'atestados' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Histórico de Atestados</h3>
              </div>

              {data && data.atestados.length === 0 ? (
                <EmptyState icon={<Shield size={48} />} text="Nenhum atestado emitido até o momento." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', flexGrow: 1, minHeight: '500px' }}>
                  
                  {/* LEFT: LIST OF CERTIFICATES */}
                  <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem', overflowY: 'auto', maxHeight: '600px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Profissional</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Data</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Liberação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.atestados.map(a => (
                          <tr 
                            key={a.id} 
                            onClick={() => setSelectedAtestado(a)}
                            style={{ 
                              cursor: 'pointer', 
                              borderBottom: '1px solid var(--border)',
                              background: selectedAtestado?.id === a.id ? 'var(--mint-light)' : 'transparent',
                              transition: 'all 0.2s'
                            }}
                          >
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                              {a.doctor_name} <br />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CRM {a.doctor_crm}</span>
                            </td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(a.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {a.download_released ? <CheckCircle size={16} color="var(--success)" /> : <Lock size={16} color="#94a3b8" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* RIGHT: PREVIEW AREA */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <div style={{ flexGrow: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '2rem', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)', position: 'relative' }}>
                        {selectedAtestado ? (
                          <div className="certificate-content" style={{ fontFamily: 'serif', color: '#1e293b', lineHeight: 1.8 }}>
                             <div style={{ textAlign: 'center', marginBottom: '2.5rem', borderBottom: '2px solid var(--mint)', pb: '1rem' }}>
                                <h2 style={{ fontSize: '1.5rem', color: 'var(--navy-dark)', letterSpacing: '0.1em' }}>ATESTADO MÉDICO</h2>
                             </div>
                             
                             <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                                {selectedAtestado.content || `Atesto para os devidos fins que o(a) Sr(a). ${data?.patient.name}, portador(a) do CPF ${data?.patient.cpf}, foi atendido(a) em consulta médica nesta data, devendo permanecer em repouso por um período de ${selectedAtestado.days_off} dia(s) a partir desta data.\n\nCID: ${selectedAtestado.cid || 'Não informado'}`}
                             </div>

                             <div style={{ marginTop: '4rem', textAlign: 'center' }}>
                                <div style={{ width: '250px', borderBottom: '1px solid #000', margin: '0 auto 0.5rem auto' }}></div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Dr(a). {selectedAtestado.doctor_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CRM {selectedAtestado.doctor_crm}</div>
                             </div>

                             <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.65rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                                CÓDIGO DE VALIDAÇÃO: {selectedAtestado.code}
                             </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                             Selecione um atestado para visualizar
                          </div>
                        )}
                     </div>

                     {/* FOOTER ACTIONS */}
                     <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <DownloadButton 
                          released={selectedAtestado?.download_released} 
                          onClick={() => selectedAtestado?.pdf_url && openDocument(selectedAtestado.pdf_url)} 
                          label="Baixar PDF do Atestado" 
                          variant="primary"
                        />
                     </div>
                  </div>

                </div>
              )}
            </div>
          )}


        </main>
      </div>
    </div>
  );
};

/* ===== SUB-COMPONENTS ===== */

const DownloadButton = ({ released, onClick, label, variant = 'outline' }: any) => {
  if (!released) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '0.4rem', 
        padding: '0.4rem 0.75rem', borderRadius: '0.5rem', 
        background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', 
        fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'not-allowed'
      }}>
        <Lock size={12} /> Aguardando Liberação
      </div>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant} btn-sm`} 
      style={{ gap: '0.4rem', padding: '0.4rem 0.75rem', height: 'auto', fontSize: '0.75rem' }}
    >
      <Download size={14} /> {label}
    </button>
  );
};

const InfoPill = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
    {icon} {text}
  </span>
);

const StatMini = ({ icon, bg, color, label, value }: { icon: React.ReactNode; bg: string; color: string; label: string; value: number }) => (
  <div style={{
    background: 'var(--bg-white)', padding: '1.1rem', borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  }}>
    <div style={{ padding: '0.5rem', background: bg, borderRadius: 'var(--radius-md)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>{icon}</div>
    <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-heading)' }}>{value}</h2>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div style={{
    background: 'var(--bg-subtle)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  }}>
    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</span>
    <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-heading)' }}>{value}</span>
  </div>
);

const ConsultationCard = ({ consultation, expanded }: { consultation: Consultation; expanded?: boolean }) => (
  <div style={{
    background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', marginBottom: '0.6rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? '0.65rem' : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={13} color="var(--text-muted)" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(consultation.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>Dr(a). {consultation.doctor_name}</span>
      </div>
      <DownloadButton released={consultation.download_released} onClick={() => consultation.pdf_path && openDocument(consultation.pdf_path)} label="PDF" />
    </div>

    {expanded && (
      <div style={{ marginTop: '0.35rem' }}>
        {consultation.notes && (
          <div style={{ marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evolução</span>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-body)', margin: '0.15rem 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{consultation.notes}</p>
          </div>
        )}
      </div>
    )}
  </div>
);

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
    <div style={{ opacity: 0.25, marginBottom: '0.6rem' }}>
        {icon}
    </div>
    <p style={{ fontSize: '0.9rem', margin: 0 }}>{text}</p>
  </div>
);

export default PatientProfile;
