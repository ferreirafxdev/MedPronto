import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, Terminal, Shield, RefreshCw, 
  UserPlus, Users, Search, Trash2, Clipboard, FileText, 
  Download, Filter, ChevronRight, X, UserCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'infra' | 'doctors' | 'patients' | 'queue'>('infra');
  const [loading, setLoading] = useState(false);

  // -- Infra State --
  const [status, setStatus] = useState<any>(null);

  // -- Doctors State --
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', crm: '', email: '', password: '', specialty: '' });

  // -- Patients State --
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // -- Queue State --
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
      console.error("Error fetching admin data", e);
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
      setNewDoctor({ name: '', crm: '', email: '', password: '', specialty: '' });
      fetchData();
    } catch (e) { alert("Erro ao cadastrar médico"); }
    finally { setLoading(false); }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este médico?")) return;
    try {
      await apiClient.delete(`/api/admin/doctors/${id}`);
      fetchData();
    } catch (e) { alert("Erro ao excluir"); }
  };

  const handleViewRecord = async (patientId: string) => {
    setLoading(true);
    try {
      const resp = await apiClient.get(`/api/admin/patients/${patientId}/record`);
      setSelectedRecord(resp.data);
    } catch (e) { alert("Erro ao carregar prontuário"); }
    finally { setLoading(false); }
  };

  const downloadRecord = (record: any) => {
    const content = `
PRONTUÁRIO MÉDICO - MEDPRONTO
--------------------------------
Paciente: ${record.patient.name}
CPF: ${record.patient.cpf}
Email: ${record.patient.email}

HISTÓRICO DE CONSULTAS:
${record.record.consultations.map((c: any) => `
Data: ${new Date(c.created_at).toLocaleDateString()}
Notas: ${c.notes}
Prescrições: ${c.prescriptions}
--------------------------------`).join('')}

ATESTADOS EMITIDOS:
${record.record.atestados.map((a: any) => `
Data: ${new Date(a.created_at).toLocaleDateString()}
Código: ${a.code}
Dias: ${a.days_off}
CID: ${a.cid}
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#0f172a', color: 'white', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Admin Control</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SidebarLink active={activeTab === 'infra'} onClick={() => setActiveTab('infra')} icon={<Server size={18} />} label="Infra & Logs" />
          <SidebarLink active={activeTab === 'doctors'} onClick={() => setActiveTab('doctors')} icon={<Users size={18} />} label="Gestão de Médicos" />
          <SidebarLink active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} icon={<Clipboard size={18} />} label="Prontuários & Pacientes" />
          <SidebarLink active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} icon={<Activity size={18} />} label="Monitor da Fila" />
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              {activeTab === 'infra' ? 'Infraestrutura' : activeTab === 'doctors' ? 'Equipe Médica' : activeTab === 'patients' ? 'Histórico de Pacientes' : 'Gerenciamento de Fila'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Painel Administrativo MedPronto</p>
          </div>
          <button onClick={fetchData} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </header>

        {/* Tab Content: Infra */}
        {activeTab === 'infra' && status && (
          <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <StatusCard label="Status API" status={status.services.api} icon={<Activity size={24} />} />
              <StatusCard label="Supabase DB" status={status.services.supabase} icon={<Database size={24} />} />
              <StatusCard label="Redis Queue" status={status.services.redis} icon={<RefreshCw size={24} />} />
            </div>

            <div style={{ background: '#020617', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'white' }}>
                <Terminal size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>Console de Logs do Servidor</h3>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', padding: '1rem', height: '400px', overflowY: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                {status.logs.map((log: string, i: number) => (
                  <div key={i} style={{ padding: '0.4rem 0', color: log.includes('200') ? '#10b981' : log.includes('404') || log.includes('500') ? '#f43f5e' : '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Doctors */}
        {activeTab === 'doctors' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
               <button onClick={() => setShowAddDoctor(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <UserPlus size={18} /> Cadastrar Médico
               </button>
            </div>

            <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>MÉDICO</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>CRM</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>ESPECIALIDADE</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>EMAIL</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc: any) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#0f172a' }}>{doc.name}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{doc.crm}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            {doc.specialty || 'Geral'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{doc.email}</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                           <button onClick={() => handleDeleteDoctor(doc.id)} style={{ color: '#f43f5e', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                             <Trash2 size={18} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Tab Content: Patients */}
        {activeTab === 'patients' && (
          <div className="animate-fade-in">
             <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '500px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar paciente por nome ou CPF..." 
                  style={{ paddingLeft: '3rem', height: '48px', borderRadius: '1rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchData()}
                />
             </div>

             <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>PACIENTE</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>CPF</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>ÚLTIMA ATUALIZAÇÃO</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{p.cpf}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                           <button onClick={() => handleViewRecord(p.id)} className="btn btn-outline btn-sm" style={{ gap: '0.4rem' }}>
                             <FileText size={14} /> Abrir Prontuário
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Tab Content: Queue */}
        {activeTab === 'queue' && (
          <div className="animate-fade-in">
             <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>POSIÇÃO</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>PACIENTE</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>TEMPO DE ESPERA</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>QUEIXA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item: any, i: number) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 800, color: 'var(--accent)' }}>#{i + 1}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#0f172a' }}>{item.name}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(item.created_at).toLocaleTimeString()}</td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>{item.complaint}</td>
                      </tr>
                    ))}
                    {queue.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Fila vazia no momento.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Doctor */}
      {showAddDoctor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
             <button onClick={() => setShowAddDoctor(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24}/></button>
             <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Cadastrar Novo Médico</h2>
             <form onSubmit={handleAddDoctor} style={{ display: 'grid', gap: '1rem' }}>
                <div className="form-group"><label>Nome Completo</label><input required className="form-control" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label>CRM</label><input required className="form-control" value={newDoctor.crm} onChange={e => setNewDoctor({...newDoctor, crm: e.target.value})} /></div>
                  <div className="form-group"><label>Especialidade</label><input className="form-control" value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})} placeholder="Ex: Geral" /></div>
                </div>
                <div className="form-group"><label>Email</label><input required type="email" className="form-control" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} /></div>
                <div className="form-group"><label>Senha Inicial</label><input required type="password" className="form-control" value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} /></div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1rem' }} disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Modal: Patient Record */}
      {selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="premium-card" style={{ maxWidth: '800px', width: '100%', height: '85vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
             <button onClick={() => setSelectedRecord(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24}/></button>
             
             <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div>
                     <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedRecord.patient.name}</h2>
                     <p style={{ color: '#64748b', fontSize: '0.9rem' }}>CPF: {selectedRecord.patient.cpf} | Paciente desde {new Date(selectedRecord.patient.created_at).toLocaleDateString()}</p>
                   </div>
                   <button onClick={() => downloadRecord(selectedRecord)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Download size={16} /> Baixar PDF Prontuário
                   </button>
                </div>
             </div>

             <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '2rem' }}>
                <section>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                      <Activity size={18} color="var(--accent)" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Evoluções & Consultas</h3>
                   </div>
                   <div style={{ display: 'grid', gap: '1rem' }}>
                      {selectedRecord.record.consultations.map((c: any) => (
                        <div key={c.id} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleString()}</span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cod: {c.validation_code}</span>
                           </div>
                           <div style={{ fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{c.notes}</div>
                           {c.prescriptions && (
                             <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                               <strong style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'block', marginBottom: '0.5rem' }}>RECEITUÁRIO</strong>
                               <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.prescriptions}</div>
                             </div>
                           )}
                        </div>
                      ))}
                      {selectedRecord.record.consultations.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma consulta registrada.</p>}
                   </div>
                </section>

                <section>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                      <FileText size={18} color="#10b981" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Atestados Emitidos</h3>
                   </div>
                   <div style={{ display: 'grid', gap: '1rem' }}>
                      {selectedRecord.record.atestados.map((a: any) => (
                        <div key={a.id} style={{ padding: '1.25rem', background: '#f0fdf4', borderRadius: '1rem', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                              <div style={{ fontWeight: 700 }}>{a.days_off} dia(s) de afastamento</div>
                              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Emitido em {new Date(a.created_at).toLocaleDateString()} | CID: {a.cid}</div>
                           </div>
                           <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534' }}>{a.code}</div>
                        </div>
                      ))}
                      {selectedRecord.record.atestados.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum atestado emitido.</p>}
                   </div>
                </section>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick} 
    style={{ 
      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', 
      padding: '0.85rem 1rem', borderRadius: '0.75rem', border: 'none', 
      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: active ? 'white' : '#94a3b8',
      fontSize: '0.9rem', fontWeight: active ? 600 : 500,
      cursor: 'pointer', transition: 'all 0.2s',
      textAlign: 'left'
    }}
    onMouseOver={(e) => !active && (e.currentTarget.style.color = 'white')}
    onMouseOut={(e) => !active && (e.currentTarget.style.color = '#94a3b8')}
  >
    {icon} {label}
  </button>
);

const StatusCard = ({ label, status, icon }: any) => (
  <div className="premium-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    <div style={{ color: status === 'online' || status === 'connected' ? '#10b981' : '#f43f5e' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{status === 'online' || status === 'connected' ? 'Operacional' : 'Instável'}</div>
    </div>
  </div>
);

export default AdminDashboard;
