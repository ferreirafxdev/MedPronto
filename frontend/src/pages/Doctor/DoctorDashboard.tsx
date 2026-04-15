import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Users, FileUser, PlayCircle, DollarSign, TrendingUp } from 'lucide-react';

interface QueuedPatient { id: string; name: string; age: string; complaint: string; status: string; }

const DoctorDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueuedPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalConsultations: 0, earnings: 0 });

  useEffect(() => {
    if (!user || user.role !== 'doctor') { navigate('/doctor/login'); return; }
    const fetchData = async () => {
      try {
        const [qResp, sResp] = await Promise.all([apiClient.get('/api/queue'), apiClient.get(`/api/doctor/stats/${user.id}`)]);
        if (qResp.data.success) setQueue(qResp.data.queue);
        if (sResp.data.success) setStats(sResp.data.stats);
      } catch (error) { console.error("Erro ao sincronizar dados", error); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const takePatient = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.post('/api/take-patient', { doctorId: user?.id });
      if (resp.data.success) { setConsultationRoomId(resp.data.patient.id); navigate(`/doctor/consultation/${resp.data.patient.id}`); }
    } catch (error) { alert("A fila está vazia ou ocorreu um erro."); }
    finally { setLoading(false); }
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>Painel Médico — <span className="text-gradient">{user?.name}</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gerencie seus atendimentos na fila do PS Online</p>
        </div>
        <button onClick={takePatient} className="btn btn-primary btn-lg" disabled={loading}>
          <PlayCircle size={20} /> Chamar Próximo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<DollarSign size={20} />} bg="var(--mint-light)" color="var(--mint)" label="Renda do Dia (R$ 60/consulta)" value={`R$ ${stats.earnings.toLocaleString('pt-BR')}`} />
        <StatCard icon={<TrendingUp size={20} />} bg="var(--accent-ultra-light)" color="var(--accent)" label="Total Atendimentos Hoje" value={`${stats.totalConsultations} Vidas`} />
      </div>

      <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
          <Users size={20} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Fila de Espera</h3>
          <span className="status-badge status-active" style={{ marginLeft: 'auto' }}>{queue.length} paciente(s)</span>
        </div>

        {queue.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
             <FileUser size={48} opacity={0.25} style={{ marginBottom: '0.6rem' }} />
             <p style={{ fontSize: '0.88rem' }}>A fila está vazia no momento.</p>
          </div>
        ) : (
          <ul className="queue-list">
            {queue.map((p, i) => (
              <li key={p.id} className="queue-item">
                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{i + 1}</div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{p.name} — {p.age} anos</span>
                      <span className="status-badge status-waiting">Na fila</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}><strong>Queixa:</strong> {p.complaint}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, bg, color, label, value }: { icon: React.ReactNode; bg: string; color: string; label: string; value: string }) => (
  <div style={{ background: 'var(--bg-white)', padding: '1.15rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: 'var(--shadow-xs)' }}>
    <div style={{ padding: '0.6rem', background: bg, borderRadius: 'var(--radius-md)', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
      <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-heading)' }}>{value}</h2>
    </div>
  </div>
);

export default DoctorDashboard;
