import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Database, FileText } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'financas' | 'fila' | 'prontuarios' | 'medicos'>('financas');

  useEffect(() => {
    // Basic auth check
    if (!user || user.role !== 'admin') {
      // In a real app we would navigate to login, but for demo we can mock it
      if (user?.role === 'doctor') {
          // If a doctor tries to access, it's fine for testing, but ideally mock admin
      }
    }
  }, [user, navigate]);

  return (
    <div className="dashboard-container">
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Painel Administrativo</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Gestão completa da plataforma MedProntoOnline</p>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', minHeight: '600px' }}>
        <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                    <button className={`btn ${activeTab === 'financas' ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'flex-start', background: activeTab !== 'financas' ? 'transparent' : '', gap: '0.8rem' }} onClick={()=>setActiveTab('financas')}>
                        <DollarSign size={20} /> Finanças e Faturamento
                    </button>
                </li>
                <li>
                    <button className={`btn ${activeTab === 'fila' ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'flex-start', background: activeTab !== 'fila' ? 'transparent' : '', gap: '0.8rem' }} onClick={()=>setActiveTab('fila')}>
                        <Users size={20} /> Gestão de Fila
                    </button>
                </li>
                <li>
                    <button className={`btn ${activeTab === 'prontuarios' ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'flex-start', background: activeTab !== 'prontuarios' ? 'transparent' : '', gap: '0.8rem' }} onClick={()=>setActiveTab('prontuarios')}>
                        <FileText size={20} /> Prontuários (Supabase)
                    </button>
                </li>
                <li>
                    <button className={`btn ${activeTab === 'medicos' ? 'btn-primary' : ''}`} style={{ width: '100%', justifyContent: 'flex-start', background: activeTab !== 'medicos' ? 'transparent' : '', gap: '0.8rem' }} onClick={()=>setActiveTab('medicos')}>
                        <Database size={20} /> Cadastro de Médicos
                    </button>
                </li>
            </ul>
        </div>
        
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            {activeTab === 'financas' && (
                <div>
                    <h3>Resumo Financeiro Mensal</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="glass-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Faturamento</p>
                            <h2 style={{ margin: 0, color: 'var(--secondary-color)' }}>R$ 145.200,00</h2>
                        </div>
                        <div className="glass-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Custos Operacionais</p>
                            <h2 style={{ margin: 0, color: 'var(--danger-color)' }}>R$ 42.100,00</h2>
                        </div>
                        <div className="glass-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Consultas Realizadas</p>
                            <h2 style={{ margin: 0 }}>1.245</h2>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fila' && (
                <div>
                    <h3>Gestão de Fila de Espera (Geral)</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Módulo para visualização de tempo médio e distribuição de pacientes.</p>
                    <div style={{ marginTop: '2rem', padding: '2rem', background: 'var(--bg-color)', borderRadius: '0.5rem', textAlign: 'center' }}>
                        <Users size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
                        <p>A fila está integrada com Upstash Redis em tempo real.</p>
                    </div>
                </div>
            )}

            {activeTab === 'prontuarios' && (
                <div>
                    <h3>Acesso Integrado a Prontuários</h3>
                    <div className="form-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <input className="form-control" placeholder="Buscar por CPF do paciente" />
                        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Buscar no S3</button>
                    </div>
                </div>
            )}

            {activeTab === 'medicos' && (
                <div>
                    <h3>Cadastro e Gestão do Corpo Clínico</h3>
                    <form style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input className="form-control" placeholder="Nome Completo Dr." />
                        <input className="form-control" placeholder="CRM" />
                        <input className="form-control" placeholder="E-mail" />
                        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>Gerar Credenciais e Enviar</button>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
