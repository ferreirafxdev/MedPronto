import React, { useState, useEffect } from 'react';
import {
  Activity, Server, Database, Terminal, Shield, RefreshCw,
  UserPlus, Users, Search, Trash2, FileText,
  Download, X
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'infra' | 'doctors' | 'patients' | 'queue'>('infra');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', crm: '', email: '', password: '', specialty: '', cpf: '' });

  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'infra') {
        const resp = await apiClient.get('/api/admin/infra-status');
        setStatus(resp.data);
      } else if (activeTab === 'doctors') {
        const resp = await apiClient.get('/api/admin/doctors');
        setDoctors(resp.data.doctors);
      } else if (activeTab === 'patients') {
        const resp = await apiClient.get(`/api/admin/patients${searchTerm ? `?search=${searchTerm}` : ''}`);
        setPatients(resp.data.patients);
      } else if (activeTab === 'queue') {
        const resp = await apiClient.get('/api/queue');
        setQueue(resp.data.queue);
      }
    } catch (e) {
      console.error('Erro ao buscar dados administrativos', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/admin/doctors', newDoctor);
      setShowAddDoctor(false);
      setNewDoctor({ name: '', crm: '', email: '', password: '', specialty: '', cpf: '' });
      fetchData();
    } catch {
      alert('Erro ao cadastrar medico. Verifique se o CRM ou Email ja existem.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este medico? Esta acao e irreversivel.')) return;
    try {
      await apiClient.delete(`/api/admin/doctors/${id}`);
      fetchData();
    } catch {
      alert('Erro ao excluir medico.');
    }
  };

  const handleViewRecord = async (patientId: string) => {
    setLoading(true);
    try {
      const resp = await apiClient.get(`/api/admin/patients/${patientId}/record`);
      setSelectedRecord(resp.data);
    } catch {
      alert('Erro ao carregar prontuario.');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecord = (record: any) => {
    const content = `
PRONTUARIO MEDICO - MEDPRONTO
--------------------------------
Paciente: ${record.patient.name}
CPF: ${record.patient.cpf}
Email: ${record.patient.email}

HISTORICO DE CONSULTAS:
${record.record.consultations.map((c: any) => `
Data: ${new Date(c.created_at).toLocaleDateString()}
Medico: ${c.doctor_name || 'N/A'}
CRM: ${c.doctor_crm || 'N/A'}
Notas: ${c.notes}
Prescricoes: ${c.prescriptions}
--------------------------------`).join('')}

ATESTADOS EMITIDOS:
${record.record.atestados.map((a: any) => `
Data: ${new Date(a.created_at).toLocaleDateString()}
Codigo: ${a.code}
Dias: ${a.days_off}
CID: ${a.cid}
Medico: ${a.doctor_name}
--------------------------------`).join('')}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prontuario_${record.patient.name.replace(/\s/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const tabs = [
    { key: 'infra', label: 'Infraestrutura e Logs', icon: <Server size={15} /> },
    { key: 'doctors', label: 'Equipe Medica', icon: <Users size={15} /> },
    { key: 'patients', label: 'Prontuarios', icon: <FileText size={15} /> },
    { key: 'queue', label: 'Monitor de Fila', icon: <Activity size={15} /> },
  ] as const;

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[1.375rem] font-semibold mb-0.5">Painel Administrativo</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Gestao de infraestrutura, corpo clinico e prontuarios
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary py-1.5 px-3 text-[12px] gap-1.5">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar Dados
        </button>
      </div>

      {/* Subtabs Bar */}
      <div className="flex border-b border-[var(--color-border)] gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === t.key
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INFRAESTRUTURA & LOGS */}
      {activeTab === 'infra' && status && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatusCard label="Status API Node.js" status={status?.services?.api} icon={<Activity size={20} />} />
            <StatusCard label="Banco PostgreSQL" status={status?.services?.supabase} icon={<Database size={20} />} />
            <StatusCard label="Fila Redis" status={status?.services?.redis} icon={<RefreshCw size={20} />} />
          </div>

          <div className="medical-card overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
              <Terminal size={16} className="text-[var(--color-brand)]" />
              <h3 className="text-[14px] font-semibold m-0">Console de Logs do Servidor</h3>
            </div>
            <div className="p-4 bg-[#0F172A] text-white font-mono text-[12px] h-[360px] overflow-y-auto space-y-1">
              {status?.logs?.map((log: string, i: number) => (
                <div key={i} className={`py-1 border-b border-white/5 ${log.includes('200') ? 'text-emerald-400' : log.includes('404') || log.includes('500') ? 'text-rose-400' : 'text-slate-400'}`}>
                  {log}
                </div>
              ))}
              {(!status?.logs || status.logs.length === 0) && (
                <div className="text-slate-500 py-8 text-center">Aguardando trafego no servidor...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EQUIPE MEDICA */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddDoctor(true)} className="btn-primary text-[13px] py-2 px-4 gap-1.5">
              <UserPlus size={15} /> Cadastrar Medico
            </button>
          </div>

          <div className="medical-card overflow-hidden">
            <table className="medical-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CRM</th>
                  <th>CPF</th>
                  <th>Especialidade</th>
                  <th>E-mail</th>
                  <th className="text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc: any) => (
                  <tr key={doc.id}>
                    <td className="font-medium">{doc.name}</td>
                    <td className="text-[var(--color-text-secondary)]">{doc.crm}</td>
                    <td className="text-[var(--color-text-secondary)]">{doc.cpf || '-'}</td>
                    <td><span className="badge badge-info">{doc.specialty || 'Geral'}</span></td>
                    <td className="text-[var(--color-text-secondary)]">{doc.email}</td>
                    <td className="text-right">
                      <button onClick={() => handleDeleteDoctor(doc.id)} className="text-[var(--color-error)] hover:opacity-80 p-1 cursor-pointer bg-transparent border-none">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRONTUARIOS (PACIENTES) */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          <div className="max-w-[400px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              className="medical-input pl-9"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
          </div>

          <div className="medical-card overflow-hidden">
            <table className="medical-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>CPF</th>
                  <th>Data Cadastro</th>
                  <th className="text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-[var(--color-text-secondary)]">{p.cpf}</td>
                    <td className="text-[var(--color-text-muted)]">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button onClick={() => handleViewRecord(p.id)} className="btn-secondary py-1 px-3 text-[12px] gap-1">
                        <FileText size={13} /> Abrir Prontuario
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MONITOR DE FILA */}
      {activeTab === 'queue' && (
        <div className="medical-card overflow-hidden">
          <table className="medical-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Paciente</th>
                <th>Hora Entrada</th>
                <th>Queixa Principal</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item: any, i: number) => (
                <tr key={item.id}>
                  <td className="font-semibold text-[var(--color-brand)]">#{i + 1}</td>
                  <td className="font-medium">{item.name}</td>
                  <td className="text-[var(--color-text-secondary)]">{new Date(item.created_at).toLocaleTimeString()}</td>
                  <td className="text-[var(--color-text-secondary)]">{item.complaint}</td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)]">Nenhum paciente aguardando na fila.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Novo Medico */}
      {showAddDoctor && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="medical-card max-w-[460px] w-full p-6 space-y-4 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-[15px] font-semibold m-0">Cadastrar Novo Medico</h3>
              <button onClick={() => setShowAddDoctor(false)} className="text-[var(--color-text-muted)] p-1 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDoctor} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">Nome Completo</label>
                <input required className="medical-input" value={newDoctor.name} onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">CRM</label>
                  <input required className="medical-input" value={newDoctor.crm} onChange={e => setNewDoctor({ ...newDoctor, crm: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">Especialidade</label>
                  <input className="medical-input" value={newDoctor.specialty} onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })} placeholder="Geral" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">E-mail</label>
                  <input required type="email" className="medical-input" value={newDoctor.email} onChange={e => setNewDoctor({ ...newDoctor, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">CPF</label>
                  <input required className="medical-input" value={newDoctor.cpf} onChange={e => setNewDoctor({ ...newDoctor, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">Senha Inicial</label>
                <input required type="password" className="medical-input" value={newDoctor.password} onChange={e => setNewDoctor({ ...newDoctor, password: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Concluir Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Prontuario do Paciente */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="medical-card max-w-[760px] w-full h-[80vh] p-6 flex flex-col animate-slide-up relative">
            <button onClick={() => setSelectedRecord(null)} className="absolute top-4 right-4 text-[var(--color-text-muted)] p-1 border-none bg-transparent cursor-pointer">
              <X size={18} />
            </button>
            <div className="pb-4 border-b border-[var(--color-border)] flex justify-between items-start">
              <div>
                <h3 className="text-[1.125rem] font-semibold m-0">{selectedRecord.patient.name}</h3>
                <p className="text-[12px] text-[var(--color-text-secondary)] m-0">CPF: {selectedRecord.patient.cpf}</p>
              </div>
              <button onClick={() => downloadRecord(selectedRecord)} className="btn-secondary py-1.5 px-3 text-[12px] gap-1">
                <Download size={14} /> Exportar TXT
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <h4 className="text-[13px] font-semibold text-[var(--color-brand)] uppercase tracking-wider">Evolucoes Clinicas</h4>
                {selectedRecord.record.consultations.map((c: any) => (
                  <div key={c.id} className="border border-[var(--color-border)] rounded-md p-3 bg-[var(--color-bg-subtle)] space-y-1">
                    <div className="text-[11px] font-medium text-[var(--color-text-muted)]">{new Date(c.created_at).toLocaleString()} - Medico: {c.doctor_name || 'N/A'}</div>
                    <div className="text-[13px] text-[var(--color-text-primary)]">{c.notes}</div>
                    {c.prescriptions && <div className="text-[12px] text-[var(--color-brand)] pt-1 border-t border-[var(--color-border)] font-mono">{c.prescriptions}</div>}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-[13px] font-semibold text-[var(--color-success)] uppercase tracking-wider">Atestados Emitidos</h4>
                {selectedRecord.record.atestados.map((a: any) => (
                  <div key={a.id} className="border border-[var(--color-success-border)] rounded-md p-3 bg-[var(--color-success-light)] text-[12px] flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-[var(--color-success)]">{a.days_off} dia(s) - CID: {a.cid}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Codigo: {a.code}</div>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusCard = ({ label, status, icon }: { label: string; status: string; icon: React.ReactNode }) => {
  const isOnline = status === 'online' || status === 'connected';
  return (
    <div className="medical-card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-md ${isOnline ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
        <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{isOnline ? 'Operacional' : 'Instavel'}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
