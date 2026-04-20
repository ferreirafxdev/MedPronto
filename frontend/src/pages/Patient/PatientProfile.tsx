import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Loader2, User, Stethoscope, PenTool, Shield, 
  ArrowLeft, Hash, Mail, Calendar, Download, 
  Clock, ClipboardList 
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
  atestados: any[];
}

const PatientProfile = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'consultas' | 'receitas' | 'atestados'>('overview');

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
                <EmptyState icon={<Stethoscope />} text="Nenhuma consulta realizada ainda." />
              )}
            </div>
          )}

          {/* CONSULTAS */}
          {activeTab === 'consultas' && (
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Histórico de Consultas</h3>
              {data && data.consultations.length === 0 ? (
                <EmptyState icon={<Stethoscope />} text="Você ainda não realizou nenhuma consulta." />
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
                <EmptyState icon={<PenTool />} text="Nenhuma receita ou exame emitido." />
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
                          {c.receita_pdf_url && (
                             <button className="btn btn-sm" onClick={() => c.receita_pdf_url && openDocument(c.receita_pdf_url)} 
                               style={{ background: 'var(--accent-ultra-light)', color: 'var(--accent)', border: 'none', fontSize: '0.65rem', padding: '0.2rem 0.5rem', height: 'auto', gap: '0.2rem' }}>
                               <Download size={10} /> Baixar Receita
                             </button>
                          )}
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
                          {c.exames_pdf_url && (
                             <button className="btn btn-sm" onClick={() => c.exames_pdf_url && openDocument(c.exames_pdf_url)} 
                               style={{ background: 'var(--mint-light)', color: 'var(--mint)', border: 'none', fontSize: '0.65rem', padding: '0.2rem 0.5rem', height: 'auto', gap: '0.2rem' }}>
                               <Download size={10} /> Baixar Pedido
                             </button>
                          )}
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
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Atestados Emitidos</h3>
              {data && data.atestados.length === 0 ? (
                <EmptyState icon={<Shield />} text="Nenhum atestado emitido até o momento." />
              ) : (
                data?.atestados.map(a => (
                  <div key={a.id} style={{
                    background: 'var(--bg-subtle)', padding: '1.1rem', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)', marginBottom: '0.65rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-heading)' }}>{a.days_off} dia(s) de afastamento</span>
                        {a.cid && <span className="status-badge" style={{ background: 'var(--violet-light)', color: 'var(--violet)', fontSize: '0.62rem' }}>CID: {a.cid}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Stethoscope size={11} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                          Dr(a). {a.doctor_name} — CRM {a.doctor_crm}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                          {new Date(a.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>CÓDIGO</div>
                        <span style={{
                          display: 'inline-block', padding: '0.3rem 0.6rem',
                          background: 'var(--accent-ultra-light)', color: 'var(--accent)',
                          borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.78rem',
                          fontFamily: 'monospace', letterSpacing: '0.04em',
                        }}>{a.code}</span>
                      </div>
                      {a.pdf_url && (
                        <button className="btn btn-primary btn-sm" onClick={() => openDocument(a.pdf_url)} style={{ height: '38px', gap: '0.3rem', padding: '0 0.8rem' }}>
                          <Download size={14} /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

/* ===== SUB-COMPONENTS ===== */

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
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CRM {consultation.doctor_crm}</span>
      </div>
      {consultation.pdf_path && (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => openDocument(consultation.pdf_path)}
          style={{ gap: '0.25rem' }}
        >
          <Download size={11} /> PDF
        </button>
      )}
    </div>

    {expanded && (
      <div style={{ marginTop: '0.35rem' }}>
        {consultation.notes && (
          <div style={{ marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evolução</span>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-body)', margin: '0.15rem 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{consultation.notes}</p>
          </div>
        )}
        {consultation.prescriptions && (
          <div style={{ marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Prescrição</span>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-body)', margin: '0.15rem 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{consultation.prescriptions}</p>
          </div>
        )}
        {consultation.exams && (
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--mint)', textTransform: 'uppercase' }}>Exames</span>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-body)', margin: '0.15rem 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{consultation.exams}</p>
          </div>
        )}
      </div>
    )}
  </div>
);

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
    <div style={{ opacity: 0.25, marginBottom: '0.6rem' }}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 48 }) : icon}
    </div>
    <p style={{ fontSize: '0.9rem', margin: 0 }}>{text}</p>
  </div>
);

export default PatientProfile;
