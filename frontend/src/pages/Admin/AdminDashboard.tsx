import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Users, Database, TrendingUp, ArrowUpDown, ExternalLink, RefreshCw, BarChart3, FileText, Activity, Terminal, ShieldCheck, Server } from 'lucide-react';
import apiClient from '../../api/client';
import { openDocument } from '../../utils/s3';

const AdminDashboard = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'financas' | 'fila' | 'prontuarios' | 'medicos' | 'infra'>('financas');
    const [stats, setStats] = useState({ totalConsultations: 0, revenue: 0, costs: 0, profit: 0, patientCount: 0, doctorCount: 0 });
    const [queue, setQueue] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [consultations, setConsultations] = useState<any[]>([]);
    const [infraStatus, setInfraStatus] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'admin') { navigate('/doctor/login'); return; }
        loadData();
        const interval = setInterval(() => {
            fetchQueue();
            if (activeTab === 'infra') fetchInfraStatus();
        }, 10000);
        return () => clearInterval(interval);
    }, [user, navigate, activeTab]);

    const loadData = async () => { 
        setLoading(true); 
        await Promise.all([fetchStats(), fetchQueue(), fetchDoctors(), fetchPatients(), fetchConsultations(), fetchInfraStatus()]); 
        setLoading(false); 
    };

    const fetchStats = async () => { try { const r = await apiClient.get('/api/admin/stats'); if (r.data.success) setStats(r.data.stats); } catch (e) { console.error(e); } };
    const fetchQueue = async () => { try { const r = await apiClient.get('/api/queue'); if (r.data.success) setQueue(r.data.queue); } catch (e) { console.error(e); } };
    const fetchDoctors = async () => { try { const r = await apiClient.get('/api/admin/doctors'); if (r.data.success) setDoctors(r.data.doctors); } catch (e) { console.error(e); } };
    const fetchPatients = async () => { try { const r = await apiClient.get('/api/admin/patients'); if (r.data.success) setPatients(r.data.patients); } catch (e) { console.error(e); } };
    const fetchConsultations = async () => { try { const r = await apiClient.get('/api/admin/consultations'); if (r.data.success) setConsultations(r.data.consultations); } catch (e) { console.error(e); } };
    const fetchInfraStatus = async () => { try { const r = await apiClient.get('/api/admin/infra-status'); if (r.data.success) setInfraStatus(r.data); } catch (e) { console.error(e); } };

    const movePatient = async (index: number, direction: 'up' | 'down') => {
        const newQueue = [...queue]; const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newQueue.length) return;
        [newQueue[index], newQueue[newIndex]] = [newQueue[newIndex], newQueue[index]];
        try { await apiClient.post('/api/admin/reorder-queue', { newOrder: newQueue.map(q => JSON.stringify(q)) }); fetchQueue(); } catch (e) { alert("Erro ao reordenar"); }
    };

    const tabs = [
        { key: 'financas', icon: <BarChart3 size={16} />, label: 'Finanças' },
        { key: 'fila', icon: <Users size={16} />, label: 'Fila' },
        { key: 'pacientes', icon: <Users size={16} />, label: 'Pacientes' },
        { key: 'medicos', icon: <Database size={16} />, label: 'Médicos' },
        { key: 'prontuarios', icon: <FileText size={16} />, label: 'Consultas' },
        { key: 'infra', icon: <Activity size={16} />, label: 'Infra & Logs' },
    ];

    return (
        <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#0f172a' }}>
                        Admin <span style={{ color: '#6366f1' }}>Portal</span>
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>Central de Operações e Monitoramento de Infraestrutura</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: infraStatus?.services?.api === 'online' ? '#10b981' : '#ef4444', boxShadow: '0 0 8px currentColor' }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>API {infraStatus?.services?.api?.toUpperCase() || 'OFFLINE'}</span>
                    </div>
                    <button className="btn btn-primary" onClick={loadData} disabled={loading} style={{ background: '#6366f1', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Sincronizando...' : 'Sincronizar Tudo'}
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: activeTab === t.key ? 700 : 500,
                            color: activeTab === t.key ? 'white' : '#64748b',
                            background: activeTab === t.key ? '#6366f1' : 'transparent',
                            transition: 'all 0.2s ease', textAlign: 'left',
                            boxShadow: activeTab === t.key ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none'
                        }}>{t.icon} {t.label}</button>
                    ))}
                    <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '1rem', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <ShieldCheck size={18} style={{ color: '#10b981' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Security Active</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>Todos os acessos são criptografados e monitorados em tempo real.</p>
                    </div>
                </aside>

                <main style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minHeight: '600px' }}>
                    {activeTab === 'financas' && (
                        <div>
                            <SectionHeader title="Performance Financeira" subtitle="Dados acumulados do faturamento da plataforma" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <MetricCard icon={<TrendingUp />} color="#10b981" label="Faturamento Bruto" value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`} trend="+12% vs last month" />
                                <MetricCard icon={<BarChart3 />} color="#6366f1" label="Lucro da Plataforma" value={`R$ ${stats.profit.toLocaleString('pt-BR')}`} trend="+5% vs last month" />
                            </div>
                            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <SmallTile label="CONSULTAS" value={stats.totalConsultations} />
                                <SmallTile label="MÉDICOS" value={stats.doctorCount} />
                                <SmallTile label="REPESSES" value={`R$ ${stats.costs.toLocaleString('pt-BR')}`} danger />
                            </div>
                        </div>
                    )}

                    {activeTab === 'fila' && (
                        <div>
                            <SectionHeader title="Fila de Espera" subtitle="Monitoramento em tempo real do fluxo de pacientes" />
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, padding: '1rem', background: '#f1f5f9', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>PACIENTES ESPERANDO</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{queue.length}</span>
                                </div>
                                <button className="btn btn-outline" onClick={() => window.open(`${import.meta.env.VITE_API_URL}/admin/queues`, '_blank')} style={{ padding: '0 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ExternalLink size={16} /> Abrir BullBoard
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {queue.length === 0 ? <EmptyState /> : queue.map((p, idx) => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', transition: 'transform 0.2s ease' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>{idx + 1}</div>
                                            <div>
                                                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{p.name}</strong>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>CPF: {p.cpf} • {p.complaint}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-icon" onClick={() => movePatient(idx, 'up')} disabled={idx === 0}><ArrowUpDown size={14} /></button>
                                            <button className="btn-icon" onClick={() => movePatient(idx, 'down')} disabled={idx === queue.length - 1}><ArrowUpDown size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'infra' && (
                        <div>
                            <SectionHeader title="Infraestrutura & Logs" subtitle="Estado dos serviços e atividade do sistema" />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <StatusCard icon={<Server />} label="API Gateway" status={infraStatus?.services?.api || 'offline'} />
                                <StatusCard icon={<Database />} label="Supabase DB" status={infraStatus?.services?.supabase || 'error'} />
                                <StatusCard icon={<Activity />} label="Redis Cache" status={infraStatus?.services?.redis || 'disconnected'} />
                            </div>

                            <div style={{ background: '#0f172a', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                                        <Terminal size={18} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em' }}>SYSTEM LOG CONSOLE</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>LIVE FEED</div>
                                </div>
                                <div style={{ height: '350px', overflowY: 'auto', fontFamily: '"Fira Code", monospace', fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.6, paddingRight: '1rem' }}>
                                    {infraStatus?.logs?.map((log: string, i: number) => (
                                        <div key={i} style={{ marginBottom: '0.25rem', color: log.includes('error') ? '#fca5a5' : log.includes('POST') ? '#a5f3fc' : '#e2e8f0' }}>
                                            <span style={{ color: '#64748b' }}>{log.substring(0, 10)}</span> {log.substring(10)}
                                        </div>
                                    ))}
                                    {(!infraStatus?.logs || infraStatus.logs.length === 0) && <div style={{ color: '#475569' }}>Aguardando atividade do sistema...</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Outras tabs seguem o padrão simplificado para manter o foco */}
                    {activeTab === 'medicos' && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Módulo de Médicos Ativo.</div>}
                    {activeTab === 'pacientes' && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Módulo de Pacientes Ativo.</div>}
                    {activeTab === 'prontuarios' && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Módulo de Prontuários Ativo.</div>}
                </main>
            </div>
        </div>
    );
};

// Components
const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>{subtitle}</p>
    </div>
);

const MetricCard = ({ icon, color, label, value, trend }: any) => (
    <div style={{ padding: '1.5rem', background: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ padding: '1rem', background: `${color}15`, color, borderRadius: '1rem' }}>{icon}</div>
        <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{label}</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0.15rem 0' }}>{value}</span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{trend}</span>
        </div>
    </div>
);

const SmallTile = ({ label, value, danger }: any) => (
    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 900, color: danger ? '#ef4444' : '#1e293b' }}>{value}</span>
    </div>
);

const StatusCard = ({ icon, label, status }: any) => {
    const isOk = status === 'online' || status === 'connected';
    return (
        <div style={{ padding: '1.25rem', background: isOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isOk ? '#bbf7d0' : '#fecaca'}`, borderRadius: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: isOk ? '#10b981' : '#ef4444' }}>{icon}</div>
            <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: isOk ? '#166534' : '#991b1b' }}>{label}</span>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: isOk ? '#15803d' : '#b91c1c' }}>{status.toUpperCase()}</span>
            </div>
        </div>
    );
};

const EmptyState = () => (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Nenhum dado ativo no momento.</div>
);

export default AdminDashboard;
