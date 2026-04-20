import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Users, Database, TrendingUp, ArrowUpDown, ExternalLink, RefreshCw, BarChart3, FileText, FileUser, Search } from 'lucide-react';
import apiClient from '../../api/client';
import { io } from 'socket.io-client';
import { openDocument } from '../../utils/s3';

const AdminDashboard = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'financas' | 'fila' | 'prontuarios' | 'medicos' | 'pacientes'>('financas');
    const [stats, setStats] = useState({ totalConsultations: 0, revenue: 0, costs: 0, profit: 0, patientCount: 0, doctorCount: 0 });
    const [queue, setQueue] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [consultations, setConsultations] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'admin') { navigate('/doctor/login'); return; }
        loadData();
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
        socket.on('queue_updated', fetchQueue);
        return () => { socket.disconnect(); };
    }, [user, navigate]);

    const loadData = async () => { setLoading(true); await Promise.all([fetchStats(), fetchQueue(), fetchDoctors(), fetchPatients(), fetchConsultations()]); setLoading(false); };
    const fetchStats = async () => { try { const r = await apiClient.get('/api/admin/stats'); if (r.data.success) setStats(r.data.stats); } catch (e) { console.error(e); } };
    const fetchQueue = async () => { try { const r = await apiClient.get('/api/queue'); if (r.data.success) setQueue(r.data.queue); } catch (e) { console.error(e); } };
    const fetchDoctors = async () => { try { const r = await apiClient.get('/api/admin/doctors'); if (r.data.success) setDoctors(r.data.doctors); } catch (e) { console.error(e); } };
    const fetchPatients = async () => { try { const r = await apiClient.get('/api/admin/patients'); if (r.data.success) setPatients(r.data.patients); } catch (e) { console.error(e); } };
    const fetchConsultations = async () => { try { const r = await apiClient.get('/api/admin/consultations'); if (r.data.success) setConsultations(r.data.consultations); } catch (e) { console.error(e); } };

    const movePatient = async (index: number, direction: 'up' | 'down') => {
        const newQueue = [...queue]; const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newQueue.length) return;
        [newQueue[index], newQueue[newIndex]] = [newQueue[newIndex], newQueue[index]];
        try { await apiClient.post('/api/admin/reorder-queue', { newOrder: newQueue.map(q => JSON.stringify(q)) }); } catch (e) { alert("Erro ao reordenar"); }
    };

    const tabs = [
        { key: 'financas', icon: <BarChart3 size={16} />, label: 'Finanças' },
        { key: 'fila', icon: <Users size={16} />, label: 'Fila' },
        { key: 'pacientes', icon: <Users size={16} />, label: 'Pacientes' },
        { key: 'medicos', icon: <Database size={16} />, label: 'Médicos' },
        { key: 'prontuarios', icon: <FileText size={16} />, label: 'Consultas' },
    ];

    return (
        <div className="dashboard-container">
            <header style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.15rem' }}>Admin <span className="text-gradient">Console</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Operação Real Time • Neon DB • Fila Redis</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadData} disabled={loading} style={{ gap: '0.35rem' }}>
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'Sincronizando...' : 'Sincronizar'}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1.25rem' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                            border: activeTab === t.key ? '1px solid var(--accent-light)' : '1px solid transparent',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.83rem',
                            fontWeight: activeTab === t.key ? 600 : 500,
                            color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                            background: activeTab === t.key ? 'var(--accent-ultra-light)' : 'transparent',
                            transition: 'all 0.15s var(--ease)', textAlign: 'left',
                        }}>{t.icon} {t.label}</button>
                    ))}
                </aside>

                <main style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', minHeight: '450px' }}>

                    {activeTab === 'financas' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                <MiniCard icon={<TrendingUp size={20} />} bg="var(--mint-light)" color="var(--mint)" label="Receita Bruta (R$ 50/consult)" value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                                <MiniCard icon={<BarChart3 size={20} />} bg="var(--accent-ultra-light)" color="var(--accent)" label="Lucro Líquido Site (R$ 25)" value={`R$ ${stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                            </div>
                            <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                                <Tile label="ATENDIMENTOS" value={stats.totalConsultations} />
                                <Tile label="TOTAL MÉDICOS" value={stats.doctorCount} />
                                <Tile label="PAGO A MÉDICOS" value={`R$ ${stats.costs.toLocaleString('pt-BR')}`} color="var(--coral)" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'fila' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Fila Viva (Redis)</h3>
                                <span className="status-badge status-active">Online</span>
                            </div>
                            {queue.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0' }}>Fila vazia no momento.</p> : queue.map((p, idx) => (
                                <div key={p.id} className="queue-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{idx + 1}</div>
                                        <div>
                                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-heading)' }}>{p.name}</strong>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CPF: {p.cpf} • {p.complaint}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => movePatient(idx, 'up')} disabled={idx === 0}><ArrowUpDown size={11} /></button>
                                        <button className="btn btn-outline btn-sm" onClick={() => movePatient(idx, 'down')} disabled={idx === queue.length - 1}><ArrowUpDown size={11} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'pacientes' && (
                        <div>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem' }}>Pacientes Cadastrados</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                                        <Th>NOME</Th><Th>CPF</Th><Th>IDADE</Th><Th>CADASTRO</Th>
                                    </tr></thead>
                                    <tbody>{patients.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
                                            <Td bold>{p.name}</Td><Td muted>{p.cpf}</Td><Td>{p.age} anos</Td><Td muted>{new Date(p.created_at).toLocaleDateString('pt-BR')}</Td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'medicos' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Corpo Clínico</h3>
                                <span className="status-badge" style={{ background: 'var(--accent-ultra-light)', color: 'var(--accent)' }}>{doctors.length} Médicos</span>
                            </div>
                            <div style={{ background: 'var(--bg-subtle)', padding: '1.15rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                                <h4 style={{ marginBottom: '0.85rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cadastrar Novo Médico</h4>
                                <form onSubmit={async (e) => {
                                    e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); const payload = Object.fromEntries(fd);
                                    try { setLoading(true); const res = await apiClient.post('/api/admin/doctors', payload); if(res.data.success) { alert("Médico cadastrado!"); (e.target as HTMLFormElement).reset(); fetchDoctors(); } }
                                    catch(err: any) { alert(err.response?.data?.error || "Erro ao cadastrar"); } finally { setLoading(false); }
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                                        <input name="name" className="form-control" placeholder="Nome do Médico" required />
                                        <input name="crm" className="form-control" placeholder="CRM (Ex: 123456)" required />
                                        <input name="cpf" className="form-control" placeholder="CPF (Apenas números)" required />
                                        <input name="email" type="email" className="form-control" placeholder="E-mail" required />
                                        <input name="password" type="password" className="form-control" placeholder="Senha" required />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.65rem', width: '100%' }} disabled={loading}>
                                        {loading ? 'Processando...' : 'Finalizar Cadastro'}
                                    </button>
                                </form>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.85rem' }}>
                                {doctors.map(d => (
                                    <div key={d.id} className="premium-card" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>{d.name}</div>
                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CRM {d.crm}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CPF {d.cpf}</div>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', marginTop: '0.25rem' }}>{d.email}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'prontuarios' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Histórico de Teleconsultas</h3>
                                <div style={{ position: 'relative', width: '250px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por paciente ou médico..." 
                                        className="form-control" 
                                        style={{ paddingRight: '2.5rem', fontSize: '0.8rem' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {consultations
                                    .filter(c => 
                                        (c.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        (c.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(c => (
                                    <div key={c.id} className="premium-card" style={{ 
                                        padding: '1.25rem', 
                                        cursor: 'pointer',
                                        background: expandedConsultation === c.id ? 'var(--accent-ultra-light)' : 'white'
                                    }} onClick={() => setExpandedConsultation(expandedConsultation === c.id ? null : c.id)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-ultra-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileUser size={20} />
                                                </div>
                                                <div>
                                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-heading)' }}>{c.patient_name || 'Paciente'}</strong>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Médico: {c.doctor_name} • CRM {c.doctor_crm || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(c.created_at).toLocaleDateString('pt-BR')} <br/>
                                                    {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openDocument(c.pdf_path); }}>
                                                    <ExternalLink size={12} /> PDF
                                                </button>
                                            </div>
                                        </div>

                                        {expandedConsultation === c.id && (
                                            <div className="animate-fade-in" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <h5 style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Queixa & Notas</h5>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                        {c.notes || 'Nenhuma nota detalhada.'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h5 style={{ fontSize: '0.75rem', color: 'var(--violet)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Conduta & Receitas</h5>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '60px' }}>
                                                        {c.prescriptions || 'Nenhuma prescrição registrada.'}
                                                    </div>
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <h5 style={{ fontSize: '0.75rem', color: 'var(--amber)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Exames Solicitados</h5>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                            {c.exams || 'Nenhum exame solicitado.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {consultations.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        Nenhum prontuário encontrado.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const MiniCard = ({ icon, bg, color, label, value }: { icon: React.ReactNode; bg: string; color: string; label: string; value: string }) => (
    <div style={{ background: 'var(--bg-white)', padding: '1.1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.7rem', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ padding: '0.55rem', background: bg, borderRadius: 'var(--radius-sm)', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div><p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.73rem' }}>{label}</p><h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-heading)' }}>{value}</h2></div>
    </div>
);
const Tile = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div style={{ background: 'var(--bg-subtle)', textAlign: 'center', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || 'var(--text-heading)' }}>{value}</div>
    </div>
);
const Th = ({ children }: { children: React.ReactNode }) => (<th style={{ padding: '0.5rem 0.65rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</th>);
const Td = ({ children, bold, muted }: { children: React.ReactNode; bold?: boolean; muted?: boolean }) => (<td style={{ padding: '0.55rem 0.65rem', fontSize: '0.83rem', fontWeight: bold ? 600 : 400, color: muted ? 'var(--text-muted)' : 'var(--text-heading)' }}>{children}</td>);

export default AdminDashboard;
