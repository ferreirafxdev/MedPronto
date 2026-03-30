import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Database, FileText, TrendingUp, ArrowUpDown, Trash2, Search, ExternalLink } from 'lucide-react';
import apiClient from '../../api/client';
import { io } from 'socket.io-client';

const AdminDashboard = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'financas' | 'fila' | 'prontuarios' | 'medicos' | 'pacientes'>('financas');
    const [stats, setStats] = useState({ totalConsultations: 0, revenue: 0, costs: 0, patientCount: 0, doctorCount: 0 });
    const [queue, setQueue] = useState<any[]>([]);
    
    // List states
    const [doctors, setDoctors] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [consultations, setConsultations] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/doctor/login'); // Or admin login
            return;
        }

        loadData();

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
        socket.on('queue_updated', fetchQueue);
        return () => { socket.disconnect(); };
    }, [user, navigate]);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([
            fetchStats(),
            fetchQueue(),
            fetchDoctors(),
            fetchPatients(),
            fetchConsultations()
        ]);
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const resp = await apiClient.get('/api/admin/stats');
            if (resp.data.success) setStats(resp.data.stats);
        } catch (e) { console.error(e); }
    };

    const fetchQueue = async () => {
        try {
            const resp = await apiClient.get('/api/queue');
            if (resp.data.success) setQueue(resp.data.queue);
        } catch (e) { console.error(e); }
    };

    const fetchDoctors = async () => {
        try {
            const resp = await apiClient.get('/api/admin/doctors');
            if (resp.data.success) setDoctors(resp.data.doctors);
        } catch (e) { console.error(e); }
    };

    const fetchPatients = async () => {
        try {
            const resp = await apiClient.get('/api/admin/patients');
            if (resp.data.success) setPatients(resp.data.patients);
        } catch (e) { console.error(e); }
    };

    const fetchConsultations = async () => {
        try {
            const resp = await apiClient.get('/api/admin/consultations');
            if (resp.data.success) setConsultations(resp.data.consultations);
        } catch (e) { console.error(e); }
    };

    const movePatient = async (index: number, direction: 'up' | 'down') => {
        const newQueue = [...queue];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newQueue.length) return;
        const temp = newQueue[index];
        newQueue[index] = newQueue[newIndex];
        newQueue[newIndex] = temp;
        try {
            const stringOrder = newQueue.map(q => JSON.stringify(q));
            await apiClient.post('/api/admin/reorder-queue', { newOrder: stringOrder });
        } catch (e) { alert("Erro ao reordenar"); }
    };

    return (
        <div className="dashboard-container">
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Admin Console</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Operação Real Time • Banco Supabase • Fila Redis</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
                    {loading ? 'Sincronizando...' : 'Sincronizar Dados Reais'}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2.5rem' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className={`btn ${activeTab === 'financas' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('financas')}>
                        <DollarSign size={20} /> Finanças e Stats
                    </button>
                    <button className={`btn ${activeTab === 'fila' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('fila')}>
                        <Users size={20} /> Controle da Fila
                    </button>
                    <button className={`btn ${activeTab === 'pacientes' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('pacientes')}>
                        <Users size={20} /> Pacientes Cadastrados
                    </button>
                    <button className={`btn ${activeTab === 'medicos' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('medicos')}>
                        <Database size={20} /> Corpo Clínico
                    </button>
                    <button className={`btn ${activeTab === 'prontuarios' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('prontuarios')}>
                        <FileText size={20} /> Histórico de Consultas
                    </button>
                </aside>

                <main style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                    
                    {activeTab === 'financas' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="feature-card" style={{ padding: '1.5rem' }}>
                                    <TrendingUp size={24} color="var(--primary-color)" />
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Faturamento Acumulado</p>
                                    <h2 style={{ fontSize: '2rem' }}>R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                                </div>
                                <div className="feature-card" style={{ padding: '1.5rem' }}>
                                    <Users size={24} color="var(--secondary-color)" />
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total na Base de Dados</p>
                                    <h2 style={{ fontSize: '2rem' }}>{stats.patientCount} Pacientes</h2>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="glass-card" style={{ margin: 0, textAlign: 'center', padding: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CONSULTAS</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalConsultations}</div>
                                </div>
                                <div className="glass-card" style={{ margin: 0, textAlign: 'center', padding: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MÉDICOS</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.doctorCount}</div>
                                </div>
                                <div className="glass-card" style={{ margin: 0, textAlign: 'center', padding: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CUSTO OP.</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)' }}>R$ {stats.costs.toLocaleString('pt-BR')}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fila' && (
                         <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3>Fila Viva (Redis Cache)</h3>
                                <div className="status-badge status-active">Online</div>
                            </div>
                            {queue.map((p, idx) => (
                                <div key={p.id} className="queue-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}</div>
                                        <div>
                                            <strong>{p.name}</strong>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPF: {p.cpf} • {p.complaint}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => movePatient(idx, 'up')} disabled={idx === 0}><ArrowUpDown size={14} transform="rotate(180)"/></button>
                                        <button className="btn btn-outline btn-sm" onClick={() => movePatient(idx, 'down')} disabled={idx === queue.length - 1}><ArrowUpDown size={14}/></button>
                                    </div>
                                </div>
                            ))}
                         </div>
                    )}

                    {activeTab === 'pacientes' && (
                        <div>
                            <h3>Base de Dados de Pacientes</h3>
                            <div className="table-responsive" style={{ marginTop: '1.5rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            <th style={{ padding: '0.75rem' }}>NOME</th>
                                            <th style={{ padding: '0.75rem' }}>CPF</th>
                                            <th style={{ padding: '0.75rem' }}>IDADE</th>
                                            <th style={{ padding: '0.75rem' }}>CADASTRO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{p.name}</td>
                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{p.cpf}</td>
                                                <td style={{ padding: '0.75rem' }}>{p.age} anos</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'medicos' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3>Corpo Clínico Integrado</h3>
                                <div className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>{doctors.length} Médicos</div>
                            </div>

                            {/* Formulário de Cadastro */}
                            <div className="glass-card" style={{ margin: '0 0 2rem 0', padding: '1.5rem', background: '#f8fafc' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Cadastrar Novo Médico</h4>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.target as HTMLFormElement);
                                    const payload = Object.fromEntries(fd);
                                    try {
                                        setLoading(true);
                                        const res = await apiClient.post('/api/admin/doctors', payload);
                                        if(res.data.success) {
                                            alert("Médico cadastrado com sucesso!");
                                            (e.target as HTMLFormElement).reset();
                                            fetchDoctors();
                                        }
                                    } catch(err: any) {
                                        alert(err.response?.data?.error || "Erro ao cadastrar médico");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <input name="name" className="form-control" placeholder="Nome do Médico" required />
                                        <input name="crm" className="form-control" placeholder="CRM (Ex: 123456)" required />
                                        <input name="email" type="email" className="form-control" placeholder="E-mail de Acesso" required />
                                        <input name="password" type="password" className="form-control" placeholder="Senha Provisória" required />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                                        {loading ? 'Processando...' : 'Finalizar Cadastro e Liberar Acesso'}
                                    </button>
                                </form>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {doctors.map(d => (
                                    <div key={d.id} className="glass-card" style={{ margin: 0, padding: '1rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{d.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CRM {d.crm}</div>
                                        <div style={{ fontSize: '0.8rem' }}>{d.email}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'prontuarios' && (
                        <div>
                            <h3>Histórico Geral de Teleconsultas</h3>
                            <div style={{ marginTop: '1.5rem' }}>
                                {consultations.map(c => (
                                    <div key={c.id} className="queue-item" style={{ cursor: 'default' }}>
                                        <div>
                                            <strong>{c.patients?.name || 'Paciente Excluído'}</strong>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Atendido por: {c.doctors?.name || 'Médico'} • {new Date(c.created_at).toLocaleString('pt-BR')}</div>
                                        </div>
                                        <button className="btn btn-outline btn-sm" onClick={() => window.open(c.pdf_path, '_blank')}>
                                            <ExternalLink size={14} /> Ver PDF
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
